(function(){
  'use strict';

  var DATA_URL = '/assets/projects/warehouse-kpi/data/mock-data.json';
  var FALLBACK_LANG = 'en';
  var SUPPORTED_LANGS = ['tr', 'de', 'en'];

  var STRINGS = {
    tr: {
      pageTitle: 'Warehouse KPI Dashboard',
      loading: 'Mock veri ve KPI hesaplari yukleniyor...',
      error: 'Veri yuklenemedi. JSON dosyasi veya baglanti kontrol edilmeli.',
      filterWindow: 'Zaman penceresi',
      filterZone: 'Bolge',
      filterShift: 'Vardiya',
      option7: 'Son 7 gun',
      option14: 'Son 14 gun',
      optionAll: 'Tum donem',
      optionAllZones: 'Tum bolgeler',
      optionAllShifts: 'Tum vardiyalar',
      shiftDay: 'Gunduz',
      shiftLate: 'Aksam',
      shiftNight: 'Gece',
      subtitleTrend: 'Barlar sevk edilen siparis sayisini, cizgi ise gunluk on-time shipment oranini gosterir.',
      subtitleBreakdown: 'Zone bazli backlog ve service seviyesi kirilimi.',
      subtitleInsights: 'Bu bolum sadece sayi gostermek yerine karar sinyali uretir.',
      previousWindow: 'onceki pencereye gore',
      noPrevious: 'karsilastirma yok',
      noData: 'Secilen filtrede veri yok.',
      target: 'Hedef',
      records: 'Kayit',
      sourceWindow: 'Veri penceresi',
      refreshed: 'Demo veri aktif',
      sourceMix: function(counts){
        return counts.orders + ' orders · ' + counts.receipts + ' receipts · ' + counts.checks + ' cycle count';
      },
      legendShipments: 'Sevk edilen siparis adedi',
      legendOnTime: 'On-time shipment %',
      kpiOnTime: 'On-time shipment',
      kpiCycle: 'Order cycle time',
      kpiPick: 'Picking accuracy',
      kpiBacklog: 'Open backlog',
      kpiInventory: 'Inventory accuracy',
      kpiDock: 'Dock-to-stock',
      unitHours: 'saat',
      unitOrders: 'siparis',
      unitPercentPts: 'puan',
      summaryOnTime: function(metric){ return metric.onTimeCount + ' / ' + metric.shippedCount + ' sevkiyat promise time icinde cikti'; },
      summaryCycle: function(metric){ return 'Siparis acilisindan sevkiyata ortalama gecis suresi'; },
      summaryPick: function(metric){ return metric.pickErrors + ' hata / ' + metric.pickedLines + ' pick line'; },
      summaryBacklog: function(metric){ return metric.backlogCount + ' acik siparis secili filtrede bekliyor'; },
      summaryInventory: function(metric){ return metric.exactChecks + ' dogru sayim / ' + metric.totalChecks + ' kontrol'; },
      summaryDock: function(metric){ return 'Mal kabulden stok kullanilabilir olana kadar ortalama sure'; },
      insightBacklog: function(zone, share, onTime){ return zone + ' bolgesi acik backlogun %' + share + ' kismini tasiyor ve on-time shipment %' + onTime + ' seviyesinde.'; },
      insightShift: function(shift, accuracy){ return shift + ' vardiyasi en dusuk picking accuracy degerine sahip: %' + accuracy + '.'; },
      insightDock: function(zone, zoneDock, overallDock){ return zone + ' bolgesi dock-to-stock suresinde one cikiyor: ' + zoneDock + ' saat, genel ortalamadan ' + overallDock + ' saat daha yavas.'; },
      insightInventory: function(zone, accuracy){ return zone + ' bolgesinde inventory accuracy %' + accuracy + ' ile diger alanlara gore daha fazla sayim sapmasi var.'; },
      breakdownBacklog: 'Backlog',
      breakdownOnTime: 'On-time',
      emptyBreakdown: 'Breakdown olusturmak icin yeterli veri yok.'
    },
    de: {
      pageTitle: 'Warehouse KPI Dashboard',
      loading: 'Mock-Daten und KPI-Berechnungen werden geladen...',
      error: 'Die Daten konnten nicht geladen werden. Bitte JSON-Datei oder Verbindung prüfen.',
      filterWindow: 'Zeitraum',
      filterZone: 'Zone',
      filterShift: 'Schicht',
      option7: 'Letzte 7 Tage',
      option14: 'Letzte 14 Tage',
      optionAll: 'Gesamter Zeitraum',
      optionAllZones: 'Alle Zonen',
      optionAllShifts: 'Alle Schichten',
      shiftDay: 'Tag',
      shiftLate: 'Spät',
      shiftNight: 'Nacht',
      subtitleTrend: 'Die Balken zeigen die Anzahl versandter Aufträge, die Linie die tägliche On-time-Rate.',
      subtitleBreakdown: 'Backlog- und Service-Level-Aufschlüsselung nach Zone.',
      subtitleInsights: 'Dieser Bereich soll nicht nur Zahlen zeigen, sondern Entscheidungssignale liefern.',
      previousWindow: 'gegenüber dem vorherigen Zeitraum',
      noPrevious: 'kein Vergleich',
      noData: 'Für den gewählten Filter gibt es keine Daten.',
      target: 'Ziel',
      records: 'Datensätze',
      sourceWindow: 'Datenfenster',
      refreshed: 'Demo-Daten aktiv',
      sourceMix: function(counts){
        return counts.orders + ' Orders · ' + counts.receipts + ' Receipts · ' + counts.checks + ' Cycle Counts';
      },
      legendShipments: 'Versandte Aufträge',
      legendOnTime: 'On-time shipment %',
      kpiOnTime: 'On-time shipment',
      kpiCycle: 'Order cycle time',
      kpiPick: 'Picking accuracy',
      kpiBacklog: 'Open backlog',
      kpiInventory: 'Inventory accuracy',
      kpiDock: 'Dock-to-stock',
      unitHours: 'Std.',
      unitOrders: 'Aufträge',
      unitPercentPts: 'Punkte',
      summaryOnTime: function(metric){ return metric.onTimeCount + ' von ' + metric.shippedCount + ' Sendungen wurden termingerecht versandt'; },
      summaryCycle: function(metric){ return 'Durchschnittliche Zeit von Auftragserstellung bis Versand'; },
      summaryPick: function(metric){ return metric.pickErrors + ' Fehler bei ' + metric.pickedLines + ' Pick-Linien'; },
      summaryBacklog: function(metric){ return metric.backlogCount + ' offene Aufträge im gewählten Filter'; },
      summaryInventory: function(metric){ return metric.exactChecks + ' exakte Counts bei ' + metric.totalChecks + ' Prüfungen'; },
      summaryDock: function(metric){ return 'Durchschnittliche Zeit vom Wareneingang bis zur Bestandsverfügbarkeit'; },
      insightBacklog: function(zone, share, onTime){ return 'Zone ' + zone + ' trägt ' + share + '% des offenen Backlogs und liegt bei ' + onTime + '% On-time shipment.'; },
      insightShift: function(shift, accuracy){ return 'Die ' + shift + '-Schicht hat mit ' + accuracy + '% die niedrigste Picking Accuracy.'; },
      insightDock: function(zone, zoneDock, overallDock){ return 'Zone ' + zone + ' ist bei Dock-to-stock auffällig: ' + zoneDock + ' Std., also ' + overallDock + ' Std. langsamer als der Gesamtschnitt.'; },
      insightInventory: function(zone, accuracy){ return 'In Zone ' + zone + ' liegt die Inventory Accuracy mit ' + accuracy + '% sichtbar unter den anderen Bereichen.'; },
      breakdownBacklog: 'Backlog',
      breakdownOnTime: 'On-time',
      emptyBreakdown: 'Nicht genug Daten für die Aufschlüsselung.'
    },
    en: {
      pageTitle: 'Warehouse KPI Dashboard',
      loading: 'Loading mock data and KPI calculations...',
      error: 'Data could not be loaded. Check the JSON file or connection.',
      filterWindow: 'Time window',
      filterZone: 'Zone',
      filterShift: 'Shift',
      option7: 'Last 7 days',
      option14: 'Last 14 days',
      optionAll: 'Full period',
      optionAllZones: 'All zones',
      optionAllShifts: 'All shifts',
      shiftDay: 'Day',
      shiftLate: 'Late',
      shiftNight: 'Night',
      subtitleTrend: 'Bars show shipped orders, while the line shows daily on-time shipment rate.',
      subtitleBreakdown: 'Zone-level backlog and service-level breakdown.',
      subtitleInsights: 'This section is meant to produce decision signals, not just display numbers.',
      previousWindow: 'vs previous window',
      noPrevious: 'no comparison',
      noData: 'No data matches the selected filters.',
      target: 'Target',
      records: 'Records',
      sourceWindow: 'Data window',
      refreshed: 'Demo data active',
      sourceMix: function(counts){
        return counts.orders + ' orders · ' + counts.receipts + ' receipts · ' + counts.checks + ' cycle counts';
      },
      legendShipments: 'Shipped orders',
      legendOnTime: 'On-time shipment %',
      kpiOnTime: 'On-time shipment',
      kpiCycle: 'Order cycle time',
      kpiPick: 'Picking accuracy',
      kpiBacklog: 'Open backlog',
      kpiInventory: 'Inventory accuracy',
      kpiDock: 'Dock-to-stock',
      unitHours: 'hrs',
      unitOrders: 'orders',
      unitPercentPts: 'pts',
      summaryOnTime: function(metric){ return metric.onTimeCount + ' / ' + metric.shippedCount + ' shipments met promise time'; },
      summaryCycle: function(metric){ return 'Average time from order creation to shipment'; },
      summaryPick: function(metric){ return metric.pickErrors + ' errors across ' + metric.pickedLines + ' picked lines'; },
      summaryBacklog: function(metric){ return metric.backlogCount + ' open orders remain in the selected window'; },
      summaryInventory: function(metric){ return metric.exactChecks + ' exact counts out of ' + metric.totalChecks + ' checks'; },
      summaryDock: function(metric){ return 'Average time from receipt to stock availability'; },
      insightBacklog: function(zone, share, onTime){ return 'Zone ' + zone + ' carries ' + share + '% of the open backlog and is running at ' + onTime + '% on-time shipment.'; },
      insightShift: function(shift, accuracy){ return shift + ' shift has the lowest picking accuracy at ' + accuracy + '%.'; },
      insightDock: function(zone, zoneDock, overallDock){ return 'Zone ' + zone + ' stands out on dock-to-stock: ' + zoneDock + ' hrs, which is ' + overallDock + ' hrs slower than the overall average.'; },
      insightInventory: function(zone, accuracy){ return 'Zone ' + zone + ' shows the weakest inventory accuracy at ' + accuracy + '%, pointing to count variance risk.'; },
      breakdownBacklog: 'Backlog',
      breakdownOnTime: 'On-time',
      emptyBreakdown: 'Not enough data to build the breakdown.'
    }
  };

  var METRIC_CONFIG = [
    { key: 'onTime', direction: 'up', target: '>= 95%' },
    { key: 'cycle', direction: 'down', target: '<= 14 h' },
    { key: 'pick', direction: 'up', target: '>= 99%' },
    { key: 'backlog', direction: 'down', target: '<= 8' },
    { key: 'inventory', direction: 'up', target: '>= 98%' },
    { key: 'dock', direction: 'down', target: '<= 6 h' }
  ];

  var state = {
    raw: null,
    filters: {
      window: '14',
      zone: 'all',
      shift: 'all'
    }
  };

  var els = {};

  function getLang(){
    var lang = (document.documentElement.lang || '').toLowerCase();
    return SUPPORTED_LANGS.indexOf(lang) >= 0 ? lang : FALLBACK_LANG;
  }

  function strings(){
    return STRINGS[getLang()] || STRINGS[FALLBACK_LANG];
  }

  function $(id){
    return document.getElementById(id);
  }

  function escapeHtml(value){
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseDate(value){
    return value ? new Date(value) : null;
  }

  function startOfDay(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  function endOfDay(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function unique(values){
    return Array.from(new Set(values));
  }

  function formatNumber(value, digits){
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return new Intl.NumberFormat(localeForLang(), {
      minimumFractionDigits: digits || 0,
      maximumFractionDigits: digits || 0
    }).format(value);
  }

  function formatPercent(value){
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return formatNumber(value, 1) + '%';
  }

  function formatHours(value){
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return formatNumber(value, 1) + ' ' + strings().unitHours;
  }

  function formatCount(value){
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return formatNumber(value, 0);
  }

  function localeForLang(){
    var lang = getLang();
    if (lang === 'tr') return 'tr-TR';
    if (lang === 'de') return 'de-DE';
    return 'en-US';
  }

  function shiftLabel(value){
    var s = strings();
    if (value === 'Day') return s.shiftDay;
    if (value === 'Late') return s.shiftLate;
    if (value === 'Night') return s.shiftNight;
    return value;
  }

  function buildSelect(selectEl, options, currentValue){
    selectEl.innerHTML = options.map(function(option){
      var selected = option.value === currentValue ? ' selected' : '';
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
    }).join('');
  }

  function latestDate(raw){
    var dates = [];
    raw.orders.forEach(function(order){ dates.push(parseDate(order.created_at)); });
    raw.receipts.forEach(function(receipt){ dates.push(parseDate(receipt.received_at)); });
    raw.inventory_checks.forEach(function(check){ dates.push(parseDate(check.checked_at)); });
    return dates.reduce(function(max, date){
      return !max || date > max ? date : max;
    }, null);
  }

  function earliestDate(raw){
    var dates = [];
    raw.orders.forEach(function(order){ dates.push(parseDate(order.created_at)); });
    raw.receipts.forEach(function(receipt){ dates.push(parseDate(receipt.received_at)); });
    raw.inventory_checks.forEach(function(check){ dates.push(parseDate(check.checked_at)); });
    return dates.reduce(function(min, date){
      return !min || date < min ? date : min;
    }, null);
  }

  function getBounds(raw, windowValue, periodOffset){
    if (windowValue === 'all') {
      return null;
    }

    var days = parseInt(windowValue, 10);
    var latest = latestDate(raw);
    var baseEnd = endOfDay(latest);
    var currentStart = startOfDay(new Date(baseEnd.getTime() - (days - 1) * 86400000));

    if (periodOffset === 1) {
      var previousEnd = endOfDay(new Date(currentStart.getTime() - 86400000));
      var previousStart = startOfDay(new Date(previousEnd.getTime() - (days - 1) * 86400000));
      return { start: previousStart, end: previousEnd };
    }

    return { start: currentStart, end: baseEnd };
  }

  function inBounds(date, bounds){
    if (!bounds) {
      return true;
    }
    return date >= bounds.start && date <= bounds.end;
  }

  function filterRecords(records, dateField, bounds, zone, shift){
    return records.filter(function(record){
      var date = parseDate(record[dateField]);
      if (!date || !inBounds(date, bounds)) {
        return false;
      }
      if (zone !== 'all' && record.zone !== zone) {
        return false;
      }
      if (shift !== 'all' && record.shift !== shift) {
        return false;
      }
      return true;
    });
  }

  function average(values){
    if (!values.length) {
      return null;
    }
    return values.reduce(function(sum, value){ return sum + value; }, 0) / values.length;
  }

  function metricBundle(orders, receipts, checks){
    var shipped = orders.filter(function(order){ return order.status === 'shipped' && order.shipped_at; });
    var onTimeCount = shipped.filter(function(order){
      return parseDate(order.shipped_at) <= parseDate(order.promised_ship_at);
    }).length;
    var shippedCount = shipped.length;
    var cycleValues = shipped.map(function(order){
      return (parseDate(order.shipped_at) - parseDate(order.created_at)) / 3600000;
    });
    var pickedLines = shipped.reduce(function(sum, order){ return sum + order.lines; }, 0);
    var pickErrors = shipped.reduce(function(sum, order){ return sum + order.pick_errors; }, 0);
    var backlogCount = orders.filter(function(order){ return order.status === 'open'; }).length;
    var exactChecks = checks.filter(function(check){
      return check.system_units === check.counted_units;
    }).length;
    var totalChecks = checks.length;
    var dockValues = receipts.map(function(receipt){
      return (parseDate(receipt.available_at) - parseDate(receipt.received_at)) / 3600000;
    });

    return {
      onTime: {
        value: shippedCount ? (onTimeCount / shippedCount) * 100 : null,
        onTimeCount: onTimeCount,
        shippedCount: shippedCount
      },
      cycle: {
        value: average(cycleValues),
        shippedCount: shippedCount
      },
      pick: {
        value: pickedLines ? ((pickedLines - pickErrors) / pickedLines) * 100 : null,
        pickedLines: pickedLines,
        pickErrors: pickErrors
      },
      backlog: {
        value: backlogCount,
        backlogCount: backlogCount,
        totalOrders: orders.length
      },
      inventory: {
        value: totalChecks ? (exactChecks / totalChecks) * 100 : null,
        exactChecks: exactChecks,
        totalChecks: totalChecks
      },
      dock: {
        value: average(dockValues),
        receiptCount: receipts.length
      }
    };
  }

  function metricValue(bundle, key){
    return bundle[key] ? bundle[key].value : null;
  }

  function buildTrend(orders, bounds){
    if (!orders.length) {
      return [];
    }

    var shipped = orders.filter(function(order){ return order.status === 'shipped' && order.shipped_at; });
    if (!shipped.length) {
      return [];
    }

    var start = bounds ? startOfDay(bounds.start) : startOfDay(shipped.reduce(function(min, order){
      var date = parseDate(order.shipped_at);
      return !min || date < min ? date : min;
    }, null));
    var end = bounds ? endOfDay(bounds.end) : endOfDay(shipped.reduce(function(max, order){
      var date = parseDate(order.shipped_at);
      return !max || date > max ? date : max;
    }, null));

    var map = {};
    shipped.forEach(function(order){
      var key = order.shipped_at.slice(0, 10);
      if (!map[key]) {
        map[key] = { date: key, shipped: 0, onTime: 0 };
      }
      map[key].shipped += 1;
      if (parseDate(order.shipped_at) <= parseDate(order.promised_ship_at)) {
        map[key].onTime += 1;
      }
    });

    var trend = [];
    for (var cursor = new Date(start.getTime()); cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
      var key = cursor.toISOString().slice(0, 10);
      var day = map[key] || { date: key, shipped: 0, onTime: 0 };
      trend.push({
        date: key,
        shipped: day.shipped,
        onTimePct: day.shipped ? (day.onTime / day.shipped) * 100 : null
      });
    }
    return trend;
  }

  function buildBreakdown(raw, bounds, dimension){
    var values;

    if (dimension === 'zone') {
      values = state.filters.zone !== 'all'
        ? [state.filters.zone]
        : unique(raw.orders.map(function(order){ return order.zone; })).sort();
    } else {
      values = state.filters.shift !== 'all'
        ? [state.filters.shift]
        : unique(raw.orders.map(function(order){ return order.shift; }));
    }

    return values.map(function(value){
      var orders = filterRecords(raw.orders, 'created_at', bounds, dimension === 'zone' ? value : state.filters.zone, dimension === 'shift' ? value : state.filters.shift);
      var receipts = filterRecords(raw.receipts, 'received_at', bounds, dimension === 'zone' ? value : state.filters.zone, dimension === 'shift' ? value : state.filters.shift);
      var checks = filterRecords(raw.inventory_checks, 'checked_at', bounds, dimension === 'zone' ? value : state.filters.zone, dimension === 'shift' ? value : state.filters.shift);
      var bundle = metricBundle(orders, receipts, checks);
      return {
        key: value,
        label: dimension === 'shift' ? shiftLabel(value) : value,
        metrics: bundle,
        orderCount: orders.length
      };
    }).filter(function(item){
      return item.orderCount || item.metrics.dock.receiptCount || item.metrics.inventory.totalChecks;
    });
  }

  function buildView(raw){
    var currentBounds = getBounds(raw, state.filters.window, 0);
    var previousBounds = getBounds(raw, state.filters.window, 1);
    var zone = state.filters.zone;
    var shift = state.filters.shift;

    var currentOrders = filterRecords(raw.orders, 'created_at', currentBounds, zone, shift);
    var currentReceipts = filterRecords(raw.receipts, 'received_at', currentBounds, zone, shift);
    var currentChecks = filterRecords(raw.inventory_checks, 'checked_at', currentBounds, zone, shift);

    var previousOrders = previousBounds ? filterRecords(raw.orders, 'created_at', previousBounds, zone, shift) : [];
    var previousReceipts = previousBounds ? filterRecords(raw.receipts, 'received_at', previousBounds, zone, shift) : [];
    var previousChecks = previousBounds ? filterRecords(raw.inventory_checks, 'checked_at', previousBounds, zone, shift) : [];

    return {
      currentBounds: currentBounds,
      previousBounds: previousBounds,
      currentMetrics: metricBundle(currentOrders, currentReceipts, currentChecks),
      previousMetrics: previousBounds ? metricBundle(previousOrders, previousReceipts, previousChecks) : null,
      trend: buildTrend(currentOrders, currentBounds),
      zoneBreakdown: buildBreakdown(raw, currentBounds, 'zone'),
      shiftBreakdown: buildBreakdown(raw, currentBounds, 'shift'),
      recordCount: currentOrders.length + currentReceipts.length + currentChecks.length,
      dataCounts: {
        orders: raw.orders.length,
        receipts: raw.receipts.length,
        checks: raw.inventory_checks.length
      }
    };
  }

  function deltaInfo(currentValue, previousValue, direction, type){
    if (currentValue === null || previousValue === null || previousValue === undefined) {
      return { label: strings().noPrevious, className: 'is-neutral' };
    }

    var delta = currentValue - previousValue;
    var good = direction === 'up' ? delta > 0.01 : delta < -0.01;
    var neutral = Math.abs(delta) < 0.01;
    var sign = delta > 0 ? '+' : '';
    var className = neutral ? 'is-neutral' : (good ? 'is-good' : 'is-bad');
    var amount;

    if (type === 'count') {
      amount = sign + formatCount(delta);
    } else if (type === 'hours') {
      amount = sign + formatNumber(delta, 1) + ' ' + strings().unitHours;
    } else {
      amount = sign + formatNumber(delta, 1) + ' ' + strings().unitPercentPts;
    }

    return {
      label: amount + ' ' + strings().previousWindow,
      className: className
    };
  }

  function formatMetricValue(key, value){
    if (key === 'cycle' || key === 'dock') {
      return formatHours(value);
    }
    if (key === 'backlog') {
      return formatCount(value);
    }
    return formatPercent(value);
  }

  function metricType(key){
    if (key === 'cycle' || key === 'dock') return 'hours';
    if (key === 'backlog') return 'count';
    return 'percent';
  }

  function metricSummary(key, metric){
    var s = strings();
    if (key === 'onTime') return s.summaryOnTime(metric);
    if (key === 'cycle') return s.summaryCycle(metric);
    if (key === 'pick') return s.summaryPick(metric);
    if (key === 'backlog') return s.summaryBacklog(metric);
    if (key === 'inventory') return s.summaryInventory(metric);
    return s.summaryDock(metric);
  }

  function renderFilters(raw){
    var s = strings();
    els.windowLabel.textContent = s.filterWindow;
    els.zoneLabel.textContent = s.filterZone;
    els.shiftLabel.textContent = s.filterShift;

    buildSelect(els.windowSelect, [
      { value: '7', label: s.option7 },
      { value: '14', label: s.option14 },
      { value: 'all', label: s.optionAll }
    ], state.filters.window);

    buildSelect(els.zoneSelect, [{ value: 'all', label: s.optionAllZones }].concat(
      unique(raw.orders.map(function(order){ return order.zone; })).sort().map(function(zone){
        return { value: zone, label: zone };
      })
    ), state.filters.zone);

    buildSelect(els.shiftSelect, [{ value: 'all', label: s.optionAllShifts }].concat(
      ['Day', 'Late', 'Night'].map(function(shift){
        return { value: shift, label: shiftLabel(shift) };
      })
    ), state.filters.shift);
  }

  function renderStats(view){
    var raw = state.raw;
    var windowLabel = formatShortDate(earliestDate(raw).toISOString()) + ' → ' + formatShortDate(latestDate(raw).toISOString());
    if (view.currentBounds) {
      windowLabel = formatShortDate(view.currentBounds.start.toISOString()) + ' → ' + formatShortDate(view.currentBounds.end.toISOString());
    }
    els.recordCount.textContent = formatCount(view.recordCount);
    els.sourceWindowValue.textContent = windowLabel;
    els.datasetSummary.textContent = strings().sourceMix({
      orders: formatCount(view.dataCounts.orders),
      receipts: formatCount(view.dataCounts.receipts),
      checks: formatCount(view.dataCounts.checks)
    });
    els.statusText.textContent = strings().refreshed;
  }

  function renderMetrics(view){
    els.metricGrid.innerHTML = METRIC_CONFIG.map(function(config){
      var currentMetric = view.currentMetrics[config.key];
      var previousMetric = view.previousMetrics ? view.previousMetrics[config.key] : null;
      var delta = deltaInfo(currentMetric.value, previousMetric ? previousMetric.value : null, config.direction, metricType(config.key));
      return [
        '<article class="rounded-2xl border theme-card p-5 dashboard-kpi-card">',
        '  <div class="dashboard-kpi-top">',
        '    <div>',
        '      <p class="dashboard-kpi-name">' + escapeHtml(strings()['kpi' + config.key.charAt(0).toUpperCase() + config.key.slice(1)]) + '</p>',
        '      <p class="dashboard-kpi-value">' + escapeHtml(formatMetricValue(config.key, currentMetric.value)) + '</p>',
        '    </div>',
        '    <span class="dashboard-kpi-delta ' + escapeHtml(delta.className) + '">' + escapeHtml(delta.label) + '</span>',
        '  </div>',
        '  <p class="dashboard-kpi-sub">' + escapeHtml(metricSummary(config.key, currentMetric)) + '</p>',
        '  <p class="dashboard-kpi-sub"><strong>' + escapeHtml(strings().target) + ':</strong> ' + escapeHtml(config.target) + '</p>',
        '</article>'
      ].join('');
    }).join('');
  }

  function formatShortDate(value){
    return new Intl.DateTimeFormat(localeForLang(), { month: 'short', day: 'numeric' }).format(parseDate(value));
  }

  function renderTrend(view){
    els.trendSub.textContent = strings().subtitleTrend;
    if (!view.trend.length) {
      els.trendChart.innerHTML = '<div class="dashboard-loading">' + escapeHtml(strings().noData) + '</div>';
      return;
    }

    var width = 720;
    var height = 260;
    var padding = { top: 18, right: 18, bottom: 38, left: 18 };
    var innerWidth = width - padding.left - padding.right;
    var innerHeight = height - padding.top - padding.bottom;
    var maxShipments = view.trend.reduce(function(max, day){ return Math.max(max, day.shipped); }, 0) || 1;
    var points = [];
    var bars = [];
    var labels = [];

    view.trend.forEach(function(day, index){
      var x = padding.left + (innerWidth * index / Math.max(1, view.trend.length - 1));
      var barWidth = Math.max(12, innerWidth / Math.max(view.trend.length * 1.7, 1));
      var barHeight = (day.shipped / maxShipments) * (innerHeight - 24);
      var barX = x - (barWidth / 2);
      var barY = height - padding.bottom - barHeight;
      bars.push('<rect x="' + barX.toFixed(2) + '" y="' + barY.toFixed(2) + '" width="' + barWidth.toFixed(2) + '" height="' + barHeight.toFixed(2) + '" rx="6" fill="rgba(59,130,246,0.28)"></rect>');
      if (day.onTimePct !== null) {
        var y = padding.top + ((100 - day.onTimePct) / 100) * (innerHeight - 24);
        points.push(x.toFixed(2) + ',' + y.toFixed(2));
        labels.push('<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="4.5" fill="#34d399"></circle>');
      }
    });

    var xLabels = [0, Math.floor(view.trend.length / 2), view.trend.length - 1].filter(function(value, index, arr){
      return arr.indexOf(value) === index && value >= 0;
    }).map(function(index){
      var x = padding.left + (innerWidth * index / Math.max(1, view.trend.length - 1));
      return '<text x="' + x.toFixed(2) + '" y="' + (height - 10) + '" text-anchor="middle" fill="currentColor" opacity="0.75" font-size="12">' + escapeHtml(formatShortDate(view.trend[index].date)) + '</text>';
    }).join('');

    els.trendChart.innerHTML = [
      '<svg viewBox="0 0 ' + width + ' ' + height + '" class="dashboard-chart-svg" role="img" aria-label="On-time shipment trend">',
      '  <rect x="0" y="0" width="' + width + '" height="' + height + '" fill="transparent"></rect>',
      '  <line x1="' + padding.left + '" y1="' + (height - padding.bottom) + '" x2="' + (width - padding.right) + '" y2="' + (height - padding.bottom) + '" stroke="rgba(148,163,184,0.28)" stroke-width="1"></line>',
      '  <line x1="' + padding.left + '" y1="' + padding.top + '" x2="' + padding.left + '" y2="' + (height - padding.bottom) + '" stroke="rgba(148,163,184,0.18)" stroke-width="1"></line>',
      bars.join(''),
      '  <polyline fill="none" stroke="#34d399" stroke-width="3" points="' + points.join(' ') + '"></polyline>',
      labels.join(''),
      xLabels,
      '</svg>'
    ].join('');

    els.trendLegend.innerHTML = [
      '<span><span class="dashboard-legend-dot" style="background:rgba(59,130,246,0.5)"></span>' + escapeHtml(strings().legendShipments) + '</span>',
      '<span><span class="dashboard-legend-dot" style="background:#34d399"></span>' + escapeHtml(strings().legendOnTime) + '</span>'
    ].join('');
  }

  function renderBreakdown(view){
    els.breakdownSub.textContent = strings().subtitleBreakdown;
    if (!view.zoneBreakdown.length) {
      els.breakdownChart.innerHTML = '<div class="dashboard-loading">' + escapeHtml(strings().emptyBreakdown) + '</div>';
      return;
    }

    var maxBacklog = view.zoneBreakdown.reduce(function(max, zone){
      return Math.max(max, zone.metrics.backlog.value || 0);
    }, 0) || 1;

    els.breakdownChart.innerHTML = '<div class="dashboard-bars">' + view.zoneBreakdown.map(function(zone){
      var backlog = zone.metrics.backlog.value || 0;
      var width = (backlog / maxBacklog) * 100;
      return [
        '<div class="dashboard-bar-row">',
        '  <div class="dashboard-bar-meta">',
        '    <strong>' + escapeHtml(zone.label) + '</strong>',
        '    <span class="theme-text-muted">' + escapeHtml(strings().breakdownBacklog) + ': ' + escapeHtml(formatCount(backlog)) + ' · ' + escapeHtml(strings().breakdownOnTime) + ': ' + escapeHtml(formatPercent(zone.metrics.onTime.value)) + '</span>',
        '  </div>',
        '  <div class="dashboard-bar-track"><div class="dashboard-bar-fill" style="width:' + width.toFixed(2) + '%"></div></div>',
        '</div>'
      ].join('');
    }).join('') + '</div>';
  }

  function renderInsights(view){
    els.insightSub.textContent = strings().subtitleInsights;
    var insights = [];

    var backlogZones = view.zoneBreakdown.filter(function(zone){ return zone.metrics.backlog.value > 0; });
    if (backlogZones.length) {
      var topBacklog = backlogZones.reduce(function(best, zone){
        return zone.metrics.backlog.value > best.metrics.backlog.value ? zone : best;
      });
      var totalBacklog = backlogZones.reduce(function(sum, zone){ return sum + zone.metrics.backlog.value; }, 0) || 1;
      insights.push(strings().insightBacklog(
        topBacklog.label,
        formatNumber((topBacklog.metrics.backlog.value / totalBacklog) * 100, 0),
        formatNumber(topBacklog.metrics.onTime.value, 1)
      ));
    }

    var shiftsWithPick = view.shiftBreakdown.filter(function(shift){ return shift.metrics.pick.value !== null; });
    if (shiftsWithPick.length) {
      var weakestShift = shiftsWithPick.reduce(function(worst, shift){
        return shift.metrics.pick.value < worst.metrics.pick.value ? shift : worst;
      });
      insights.push(strings().insightShift(weakestShift.label, formatNumber(weakestShift.metrics.pick.value, 1)));
    }

    var zonesWithDock = view.zoneBreakdown.filter(function(zone){ return zone.metrics.dock.value !== null; });
    if (zonesWithDock.length) {
      var slowestDock = zonesWithDock.reduce(function(worst, zone){
        return zone.metrics.dock.value > worst.metrics.dock.value ? zone : worst;
      });
      if (view.currentMetrics.dock.value !== null && slowestDock.metrics.dock.value > view.currentMetrics.dock.value) {
        insights.push(strings().insightDock(
          slowestDock.label,
          formatNumber(slowestDock.metrics.dock.value, 1),
          formatNumber(slowestDock.metrics.dock.value - view.currentMetrics.dock.value, 1)
        ));
      }
    }

    if (insights.length < 3) {
      var zonesWithInventory = view.zoneBreakdown.filter(function(zone){ return zone.metrics.inventory.value !== null; });
      if (zonesWithInventory.length) {
        var weakestInventory = zonesWithInventory.reduce(function(worst, zone){
          return zone.metrics.inventory.value < worst.metrics.inventory.value ? zone : worst;
        });
        insights.push(strings().insightInventory(weakestInventory.label, formatNumber(weakestInventory.metrics.inventory.value, 1)));
      }
    }

    els.insightList.innerHTML = '<div class="dashboard-insights">' + insights.slice(0, 3).map(function(text, index){
      return '<div class="dashboard-insight"><strong>0' + (index + 1) + '.</strong><p>' + escapeHtml(text) + '</p></div>';
    }).join('') + '</div>';
  }

  function render(view){
    renderFilters(state.raw);
    renderStats(view);
    renderMetrics(view);
    renderTrend(view);
    renderBreakdown(view);
    renderInsights(view);
    syncPageTitle();
    els.loading.classList.add('dashboard-hidden');
    els.content.classList.remove('dashboard-hidden');
  }

  function syncPageTitle(){
    var title = $('dashboard-main-title');
    if (!title) {
      return;
    }
    document.title = title.textContent.trim() + ' — Kagan Bağdemir';
  }

  function loadData(){
    els.loading.textContent = strings().loading;
    fetch(DATA_URL)
      .then(function(response){
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function(payload){
        state.raw = payload;
        render(buildView(payload));
      })
      .catch(function(error){
        els.loading.classList.add('dashboard-hidden');
        els.error.textContent = strings().error + ' (' + error.message + ')';
        els.error.classList.remove('dashboard-hidden');
      });
  }

  function bindEvents(){
    els.windowSelect.addEventListener('change', function(event){
      state.filters.window = event.target.value;
      render(buildView(state.raw));
    });
    els.zoneSelect.addEventListener('change', function(event){
      state.filters.zone = event.target.value;
      render(buildView(state.raw));
    });
    els.shiftSelect.addEventListener('change', function(event){
      state.filters.shift = event.target.value;
      render(buildView(state.raw));
    });
    document.addEventListener('langchange', function(){
      if (!state.raw) {
        els.loading.textContent = strings().loading;
        return;
      }
      render(buildView(state.raw));
    });
  }

  function init(){
    els = {
      loading: $('dashboard-loading'),
      error: $('dashboard-error'),
      content: $('dashboard-content'),
      metricGrid: $('dashboard-metrics'),
      trendChart: $('trend-chart'),
      trendLegend: $('trend-legend'),
      trendSub: $('trend-subtitle'),
      breakdownChart: $('breakdown-chart'),
      breakdownSub: $('breakdown-subtitle'),
      insightList: $('insight-list'),
      insightSub: $('insight-subtitle'),
      recordCount: $('record-count'),
      sourceWindowValue: $('source-window-value'),
      datasetSummary: $('dataset-summary'),
      statusText: $('status-text'),
      windowSelect: $('filter-window'),
      zoneSelect: $('filter-zone'),
      shiftSelect: $('filter-shift'),
      windowLabel: $('filter-window-label'),
      zoneLabel: $('filter-zone-label'),
      shiftLabel: $('filter-shift-label')
    };

    bindEvents();
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
