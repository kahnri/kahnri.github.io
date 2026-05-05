"""Reference solver for the FEM Mini-Solver V1 portfolio demo.

The web page solves the same 3-bar 2D truss model in JavaScript so it can run
on GitHub Pages. This Python/NumPy version is the engineering reference:

    python3 assets/projects/fem-mini-solver/python/fem_solver.py
"""

from __future__ import annotations

try:
    import numpy as np
except ModuleNotFoundError as exc:
    raise SystemExit("NumPy is required. Install it with: python3 -m pip install numpy") from exc


DEFAULT_NODES = np.array(
    [
        [0.0, 0.0],  # A
        [4.0, 0.0],  # B
        [2.0, 3.0],  # C
    ],
    dtype=float,
)

DEFAULT_ELEMENTS = [(0, 1), (1, 2), (0, 2)]
DEFAULT_FIXED_DOFS = [0, 1, 3]  # A_x, A_y, B_y


def element_stiffness_2d_truss(start: np.ndarray, end: np.ndarray, elastic_modulus: float, area: float) -> np.ndarray:
    """Return a 4x4 global-coordinate stiffness matrix for one 2D truss element."""
    dx, dy = end - start
    length = float(np.hypot(dx, dy))
    c = dx / length
    s = dy / length
    axial_stiffness = elastic_modulus * area / length

    return axial_stiffness * np.array(
        [
            [c * c, c * s, -c * c, -c * s],
            [c * s, s * s, -c * s, -s * s],
            [-c * c, -c * s, c * c, c * s],
            [-c * s, -s * s, c * s, s * s],
        ],
        dtype=float,
    )


def assemble_global_stiffness(
    nodes: np.ndarray,
    elements: list[tuple[int, int]],
    elastic_modulus: float,
    area: float,
) -> np.ndarray:
    dof_count = nodes.shape[0] * 2
    global_k = np.zeros((dof_count, dof_count), dtype=float)

    for start_index, end_index in elements:
        element_k = element_stiffness_2d_truss(
            nodes[start_index],
            nodes[end_index],
            elastic_modulus,
            area,
        )
        dof_map = np.array(
            [
                start_index * 2,
                start_index * 2 + 1,
                end_index * 2,
                end_index * 2 + 1,
            ]
        )

        for local_row, global_row in enumerate(dof_map):
            for local_col, global_col in enumerate(dof_map):
                global_k[global_row, global_col] += element_k[local_row, local_col]

    return global_k


def solve_truss(
    nodes: np.ndarray = DEFAULT_NODES,
    elements: list[tuple[int, int]] | None = None,
    fixed_dofs: list[int] | None = None,
    elastic_modulus: float = 210e9,
    area: float = 2500e-6,
    load_x: float = 0.0,
    load_y: float = -12_000.0,
    load_node: int = 2,
) -> dict[str, object]:
    """Solve a 2D truss by partitioning fixed and free DOFs."""
    if elements is None:
        elements = DEFAULT_ELEMENTS
    if fixed_dofs is None:
        fixed_dofs = DEFAULT_FIXED_DOFS

    dof_count = nodes.shape[0] * 2
    global_k = assemble_global_stiffness(nodes, elements, elastic_modulus, area)
    loads = np.zeros(dof_count, dtype=float)
    loads[load_node * 2] = load_x
    loads[load_node * 2 + 1] = load_y

    fixed = np.array(fixed_dofs, dtype=int)
    free = np.array([dof for dof in range(dof_count) if dof not in fixed], dtype=int)

    reduced_k = global_k[np.ix_(free, free)]
    reduced_loads = loads[free]
    reduced_displacements = np.linalg.solve(reduced_k, reduced_loads)

    displacements = np.zeros(dof_count, dtype=float)
    displacements[free] = reduced_displacements
    reactions = global_k @ displacements - loads

    element_results = []
    for element_id, (start_index, end_index) in enumerate(elements, start=1):
        start = nodes[start_index]
        end = nodes[end_index]
        dx, dy = end - start
        length = float(np.hypot(dx, dy))
        c = dx / length
        s = dy / length
        dof_map = np.array(
            [
                start_index * 2,
                start_index * 2 + 1,
                end_index * 2,
                end_index * 2 + 1,
            ]
        )
        u = displacements[dof_map]
        axial_extension = -c * u[0] - s * u[1] + c * u[2] + s * u[3]
        strain = axial_extension / length
        stress = elastic_modulus * strain
        element_results.append(
            {
                "id": f"E{element_id}",
                "length": length,
                "strain": strain,
                "stress": stress,
                "axial_force": stress * area,
            }
        )

    return {
        "global_k": global_k,
        "loads": loads,
        "displacements": displacements,
        "reactions": reactions,
        "elements": element_results,
        "free_dofs": free,
        "fixed_dofs": fixed,
    }


def equilibrium_residual(result: dict[str, object]) -> np.ndarray:
    loads = result["loads"]
    reactions = result["reactions"]
    return np.array(
        [
            loads[0::2].sum() + reactions[0::2].sum(),
            loads[1::2].sum() + reactions[1::2].sum(),
        ],
        dtype=float,
    )


def check_single_bar() -> None:
    length = 2.0
    elastic_modulus = 210e9
    area = 1200e-6
    force = 15_000.0
    nodes = np.array([[0.0, 0.0], [length, 0.0]], dtype=float)

    result = solve_truss(
        nodes=nodes,
        elements=[(0, 1)],
        fixed_dofs=[0, 1, 3],
        elastic_modulus=elastic_modulus,
        area=area,
        load_x=force,
        load_y=0.0,
        load_node=1,
    )

    expected = force * length / (area * elastic_modulus)
    actual = result["displacements"][2]
    np.testing.assert_allclose(actual, expected, rtol=1e-12, atol=1e-12)


def check_equilibrium() -> None:
    result = solve_truss()
    residual = equilibrium_residual(result)
    np.testing.assert_allclose(residual, np.zeros(2), atol=1e-7)


def run_checks() -> None:
    check_single_bar()
    check_equilibrium()


def main() -> None:
    result = solve_truss()
    node_names = ["A", "B", "C"]

    print("FEM Mini-Solver V1 reference result")
    print("-----------------------------------")
    for index, name in enumerate(node_names):
        ux = result["displacements"][index * 2] * 1000
        uy = result["displacements"][index * 2 + 1] * 1000
        print(f"Node {name}: ux={ux: .6f} mm, uy={uy: .6f} mm")

    for element in result["elements"]:
        stress_mpa = element["stress"] / 1e6
        axial_kn = element["axial_force"] / 1000
        print(f"{element['id']}: stress={stress_mpa: .6f} MPa, axial={axial_kn: .6f} kN")

    residual = equilibrium_residual(result) / 1000
    print(f"Equilibrium residual: Fx={residual[0]: .9f} kN, Fy={residual[1]: .9f} kN")

    run_checks()
    print("Checks passed: single-bar analytic displacement and global equilibrium.")


if __name__ == "__main__":
    main()
