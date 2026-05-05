(function(){
  'use strict';

  const NODES = [
    { id: 'A', x: 0, y: 0 },
    { id: 'B', x: 4, y: 0 },
    { id: 'C', x: 2, y: 3 }
  ];

  const ELEMENTS = [
    { id: 'E1', from: 0, to: 1 },
    { id: 'E2', from: 1, to: 2 },
    { id: 'E3', from: 0, to: 2 }
  ];

  const FIXED_DOFS = [0, 1, 3];
  const DEFAULTS = {
    eGpa: 210,
    areaMm2: 2500,
    loadYKn: 12,
    loadXKn: 0,
    deformScale: 1800
  };

  const COPY = {
    tr: {
      solved: 'Cozuldu',
      nodeResult: 'sonuc vektoru',
      element: 'Eleman',
      tension: 'cekme',
      compression: 'basma',
      balanced: 'OK',
      residual: 'Artik',
      down: 'asagi'
    },
    de: {
      solved: 'Geloest',
      nodeResult: 'Resultierende',
      element: 'Element',
      tension: 'Zug',
      compression: 'Druck',
      balanced: 'OK',
      residual: 'Rest',
      down: 'nach unten'
    },
    en: {
      solved: 'Solved',
      nodeResult: 'resultant',
      element: 'Element',
      tension: 'tension',
      compression: 'compression',
      balanced: 'OK',
      residual: 'Residual',
      down: 'down'
    },
    nl: {
      solved: 'Solved',
      nodeResult: 'resultant',
      element: 'Element',
      tension: 'tension',
      compression: 'compression',
      balanced: 'OK',
      residual: 'Residual',
      down: 'down'
    },
    ja: {
      solved: 'Solved',
      nodeResult: 'resultant',
      element: 'Element',
      tension: 'tension',
      compression: 'compression',
      balanced: 'OK',
      residual: 'Residual',
      down: 'down'
    }
  };

  function currentLang(){
    return document.documentElement.lang || 'tr';
  }

  function text(key){
    const lang = currentLang();
    const pack = COPY[lang] || COPY.tr;
    return pack[key] || COPY.tr[key] || key;
  }

  function byId(id){
    return document.getElementById(id);
  }

  function zeros(rows, cols){
    return Array.from({ length: rows }, function(){
      return Array(cols).fill(0);
    });
  }

  function matVec(matrix, vector){
    return matrix.map(function(row){
      return row.reduce(function(total, value, index){
        return total + value * vector[index];
      }, 0);
    });
  }

  function solveLinear(matrix, rhs){
    const n = rhs.length;
    const a = matrix.map(function(row, index){
      return row.slice().concat(rhs[index]);
    });

    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
          pivot = row;
        }
      }

      if (Math.abs(a[pivot][col]) < 1e-12) {
        throw new Error('Singular stiffness matrix');
      }

      if (pivot !== col) {
        const tmp = a[col];
        a[col] = a[pivot];
        a[pivot] = tmp;
      }

      const pivotValue = a[col][col];
      for (let j = col; j <= n; j += 1) {
        a[col][j] /= pivotValue;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === col) {
          continue;
        }
        const factor = a[row][col];
        for (let j = col; j <= n; j += 1) {
          a[row][j] -= factor * a[col][j];
        }
      }
    }

    return a.map(function(row){
      return row[n];
    });
  }

  function assembleAndSolve(params){
    const dofCount = NODES.length * 2;
    const stiffness = zeros(dofCount, dofCount);
    const forces = Array(dofCount).fill(0);
    const elasticModulus = params.eGpa * 1e9;
    const area = params.areaMm2 * 1e-6;

    forces[2 * 2] = params.loadXKn * 1000;
    forces[2 * 2 + 1] = -params.loadYKn * 1000;

    ELEMENTS.forEach(function(element){
      const start = NODES[element.from];
      const end = NODES[element.to];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const c = dx / length;
      const s = dy / length;
      const axialK = elasticModulus * area / length;
      const local = [
        [c * c, c * s, -c * c, -c * s],
        [c * s, s * s, -c * s, -s * s],
        [-c * c, -c * s, c * c, c * s],
        [-c * s, -s * s, c * s, s * s]
      ].map(function(row){
        return row.map(function(value){
          return value * axialK;
        });
      });
      const map = [
        element.from * 2,
        element.from * 2 + 1,
        element.to * 2,
        element.to * 2 + 1
      ];

      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          stiffness[map[row]][map[col]] += local[row][col];
        }
      }
    });

    const fixed = new Set(FIXED_DOFS);
    const freeDofs = Array.from({ length: dofCount }, function(_, index){
      return index;
    }).filter(function(index){
      return !fixed.has(index);
    });
    const reducedK = freeDofs.map(function(rowDof){
      return freeDofs.map(function(colDof){
        return stiffness[rowDof][colDof];
      });
    });
    const reducedF = freeDofs.map(function(dof){
      return forces[dof];
    });
    const reducedU = solveLinear(reducedK, reducedF);
    const displacements = Array(dofCount).fill(0);

    freeDofs.forEach(function(dof, index){
      displacements[dof] = reducedU[index];
    });

    const reactions = matVec(stiffness, displacements).map(function(value, index){
      return value - forces[index];
    });

    const elementResults = ELEMENTS.map(function(element){
      const start = NODES[element.from];
      const end = NODES[element.to];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      const c = dx / length;
      const s = dy / length;
      const map = [
        element.from * 2,
        element.from * 2 + 1,
        element.to * 2,
        element.to * 2 + 1
      ];
      const u = map.map(function(dof){
        return displacements[dof];
      });
      const axialExtension = -c * u[0] - s * u[1] + c * u[2] + s * u[3];
      const strain = axialExtension / length;
      const stress = elasticModulus * strain;
      return {
        id: element.id,
        from: element.from,
        to: element.to,
        length: length,
        strain: strain,
        stress: stress,
        axialForce: stress * area
      };
    });

    const nodeResults = NODES.map(function(node, index){
      const ux = displacements[index * 2];
      const uy = displacements[index * 2 + 1];
      return {
        id: node.id,
        ux: ux,
        uy: uy,
        magnitude: Math.hypot(ux, uy)
      };
    });

    const fixedReactionFx = FIXED_DOFS.filter(function(dof){ return dof % 2 === 0; }).reduce(function(total, dof){
      return total + reactions[dof];
    }, 0);
    const fixedReactionFy = FIXED_DOFS.filter(function(dof){ return dof % 2 === 1; }).reduce(function(total, dof){
      return total + reactions[dof];
    }, 0);
    const loadFx = forces.filter(function(_, index){ return index % 2 === 0; }).reduce(function(total, value){
      return total + value;
    }, 0);
    const loadFy = forces.filter(function(_, index){ return index % 2 === 1; }).reduce(function(total, value){
      return total + value;
    }, 0);

    return {
      stiffness: stiffness,
      forces: forces,
      displacements: displacements,
      reactions: reactions,
      nodes: nodeResults,
      elements: elementResults,
      balance: {
        fx: loadFx + fixedReactionFx,
        fy: loadFy + fixedReactionFy
      }
    };
  }

  function readParams(){
    return {
      eGpa: Number(byId('e-gpa').value),
      areaMm2: Number(byId('area-mm2').value),
      loadYKn: Number(byId('load-y-kn').value),
      loadXKn: Number(byId('load-x-kn').value),
      deformScale: Number(byId('deform-scale').value)
    };
  }

  function formatNumber(value, digits){
    const clean = Math.abs(value) < Math.pow(10, -digits) / 2 ? 0 : value;
    return new Intl.NumberFormat(currentLang(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(clean);
  }

  function updateControlLabels(params){
    byId('e-gpa-value').textContent = formatNumber(params.eGpa, 0) + ' GPa';
    byId('area-mm2-value').textContent = formatNumber(params.areaMm2, 0) + ' mm2';
    byId('load-y-kn-value').textContent = formatNumber(params.loadYKn, 0) + ' kN ' + text('down');
    byId('load-x-kn-value').textContent = formatNumber(params.loadXKn, 0) + ' kN';
    byId('deform-scale-value').textContent = formatNumber(params.deformScale, 0) + 'x';
  }

  function stressColor(stress, maxStress){
    if (maxStress < 1e-9) {
      return '#a1a1aa';
    }
    const ratio = Math.min(Math.abs(stress) / maxStress, 1);
    if (stress >= 0) {
      return ratio > 0.66 ? '#fb7185' : '#fda4af';
    }
    return ratio > 0.66 ? '#60a5fa' : '#93c5fd';
  }

  function buildPlotTransform(result, scale){
    const points = [];
    NODES.forEach(function(node, index){
      points.push({ x: node.x, y: node.y });
      points.push({
        x: node.x + result.displacements[index * 2] * scale,
        y: node.y + result.displacements[index * 2 + 1] * scale
      });
    });

    const xs = points.map(function(point){ return point.x; });
    const ys = points.map(function(point){ return point.y; });
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    const width = 720;
    const height = 420;
    const pad = 70;
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const plotScale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

    return function(point){
      return {
        x: pad + (point.x - minX) * plotScale,
        y: height - pad - (point.y - minY) * plotScale
      };
    };
  }

  function supportSvg(point, kind){
    if (kind === 'fixed') {
      return [
        '<path d="M ', point.x - 22, ' ', point.y + 25, ' L ', point.x + 22, ' ', point.y + 25, ' L ', point.x, ' ', point.y + 5, ' Z" fill="rgba(16,185,129,0.16)" stroke="var(--accent-text)" stroke-width="2"/>',
        '<line x1="', point.x - 30, '" y1="', point.y + 30, '" x2="', point.x + 30, '" y2="', point.y + 30, '" stroke="var(--text-muted)" stroke-width="2"/>'
      ].join('');
    }
    return [
      '<path d="M ', point.x - 20, ' ', point.y + 25, ' L ', point.x + 20, ' ', point.y + 25, ' L ', point.x, ' ', point.y + 7, ' Z" fill="rgba(96,165,250,0.13)" stroke="#60a5fa" stroke-width="2"/>',
      '<circle cx="', point.x - 10, '" cy="', point.y + 32, '" r="4" fill="none" stroke="var(--text-muted)" stroke-width="2"/>',
      '<circle cx="', point.x + 10, '" cy="', point.y + 32, '" r="4" fill="none" stroke="var(--text-muted)" stroke-width="2"/>'
    ].join('');
  }

  function renderSvg(result, params){
    const svg = byId('fem-svg');
    const map = buildPlotTransform(result, params.deformScale);
    const base = NODES.map(map);
    const deformed = NODES.map(function(node, index){
      return map({
        x: node.x + result.displacements[index * 2] * params.deformScale,
        y: node.y + result.displacements[index * 2 + 1] * params.deformScale
      });
    });
    const maxStress = Math.max.apply(null, result.elements.map(function(element){
      return Math.abs(element.stress);
    }));
    const c = base[2];
    const loadY = params.loadYKn;
    const loadX = params.loadXKn;

    let html = [
      '<defs>',
      '<marker id="fem-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">',
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b"/>',
      '</marker>',
      '</defs>'
    ].join('');

    ELEMENTS.forEach(function(element){
      const p1 = base[element.from];
      const p2 = base[element.to];
      html += '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="rgba(161,161,170,0.7)" stroke-width="3" stroke-dasharray="8 7" stroke-linecap="round"/>';
    });

    result.elements.forEach(function(element){
      const p1 = deformed[element.from];
      const p2 = deformed[element.to];
      const color = stressColor(element.stress, maxStress);
      const width = maxStress > 0 ? 5 + 3 * Math.min(Math.abs(element.stress) / maxStress, 1) : 5;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      html += '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"/>';
      html += '<text class="fem-element-label" x="' + (midX + 8) + '" y="' + (midY - 8) + '">' + element.id + '</text>';
    });

    html += supportSvg(base[0], 'fixed');
    html += supportSvg(base[1], 'roller');
    html += '<line x1="' + c.x + '" y1="' + (c.y - 72) + '" x2="' + c.x + '" y2="' + (c.y - 18) + '" stroke="#f59e0b" stroke-width="4" marker-end="url(#fem-arrow)" stroke-linecap="round"/>';
    html += '<text class="fem-load-label" x="' + (c.x + 12) + '" y="' + (c.y - 48) + '">' + formatNumber(loadY, 0) + ' kN</text>';

    if (Math.abs(loadX) >= 0.5) {
      if (loadX > 0) {
        html += '<line x1="' + (c.x - 86) + '" y1="' + (c.y + 18) + '" x2="' + (c.x - 24) + '" y2="' + (c.y + 18) + '" stroke="#f59e0b" stroke-width="4" marker-end="url(#fem-arrow)" stroke-linecap="round"/>';
        html += '<text class="fem-load-label" x="' + (c.x - 88) + '" y="' + (c.y + 42) + '">' + formatNumber(loadX, 0) + ' kN</text>';
      } else {
        html += '<line x1="' + (c.x + 86) + '" y1="' + (c.y + 18) + '" x2="' + (c.x + 24) + '" y2="' + (c.y + 18) + '" stroke="#f59e0b" stroke-width="4" marker-end="url(#fem-arrow)" stroke-linecap="round"/>';
        html += '<text class="fem-load-label" x="' + (c.x + 28) + '" y="' + (c.y + 42) + '">' + formatNumber(loadX, 0) + ' kN</text>';
      }
    }

    base.forEach(function(point, index){
      html += '<circle cx="' + point.x + '" cy="' + point.y + '" r="5" fill="var(--surface-muted)" stroke="var(--text-muted)" stroke-width="2"/>';
      html += '<text class="fem-node-label" x="' + (point.x + 11) + '" y="' + (point.y - 11) + '">' + NODES[index].id + '</text>';
    });

    deformed.forEach(function(point){
      html += '<circle cx="' + point.x + '" cy="' + point.y + '" r="6" fill="var(--accent-text)" stroke="var(--bg)" stroke-width="2"/>';
    });

    svg.innerHTML = html;
  }

  function renderTables(result){
    byId('displacement-rows').innerHTML = result.nodes.map(function(node){
      return [
        '<tr>',
        '<td>', node.id, '</td>',
        '<td>', formatNumber(node.ux * 1000, 4), '</td>',
        '<td>', formatNumber(node.uy * 1000, 4), '</td>',
        '<td>', formatNumber(node.magnitude * 1000, 4), '</td>',
        '</tr>'
      ].join('');
    }).join('');

    byId('element-rows').innerHTML = result.elements.map(function(element){
      return [
        '<tr>',
        '<td>', element.id, '</td>',
        '<td>', formatNumber(element.length, 3), '</td>',
        '<td>', formatNumber(element.stress / 1e6, 3), '</td>',
        '<td>', formatNumber(element.axialForce / 1000, 3), '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function renderMetrics(result){
    const maxNode = result.nodes.reduce(function(best, node){
      return node.magnitude > best.magnitude ? node : best;
    }, result.nodes[0]);
    const maxElement = result.elements.reduce(function(best, element){
      return Math.abs(element.stress) > Math.abs(best.stress) ? element : best;
    }, result.elements[0]);
    const mode = maxElement.stress >= 0 ? text('tension') : text('compression');
    const residualKn = Math.hypot(result.balance.fx, result.balance.fy) / 1000;

    byId('max-displacement').textContent = formatNumber(maxNode.magnitude * 1000, 4) + ' mm';
    byId('max-displacement-note').textContent = maxNode.id + ' ' + text('nodeResult');
    byId('max-stress').textContent = formatNumber(Math.abs(maxElement.stress) / 1e6, 3) + ' MPa';
    byId('max-stress-note').textContent = text('element') + ' ' + maxElement.id + ' / ' + mode;
    byId('reaction-balance').textContent = residualKn < 0.001 ? text('balanced') : formatNumber(residualKn, 3) + ' kN';
    byId('reaction-balance-note').textContent = text('residual') + ': Fx ' + formatNumber(result.balance.fx / 1000, 4) + ' kN / Fy ' + formatNumber(result.balance.fy / 1000, 4) + ' kN';
  }

  function render(){
    const params = readParams();
    updateControlLabels(params);
    try {
      const result = assembleAndSolve(params);
      byId('solver-status').textContent = text('solved');
      renderSvg(result, params);
      renderTables(result);
      renderMetrics(result);
    } catch (error) {
      byId('solver-status').textContent = error.message;
    }
  }

  function resetModel(){
    byId('e-gpa').value = DEFAULTS.eGpa;
    byId('area-mm2').value = DEFAULTS.areaMm2;
    byId('load-y-kn').value = DEFAULTS.loadYKn;
    byId('load-x-kn').value = DEFAULTS.loadXKn;
    byId('deform-scale').value = DEFAULTS.deformScale;
    render();
  }

  function bind(){
    ['e-gpa', 'area-mm2', 'load-y-kn', 'load-x-kn', 'deform-scale'].forEach(function(id){
      byId(id).addEventListener('input', render);
    });
    byId('reset-model').addEventListener('click', resetModel);
    document.addEventListener('langchange', render);
  }

  function init(){
    bind();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
