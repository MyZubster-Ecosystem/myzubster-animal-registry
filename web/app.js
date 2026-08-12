// MyZubster Web NFC Tag Simulator - UI controller.
// Wires the static HTML form/buttons to the simulator core.
(function () {
  'use strict';

  var Sim = window.MyZubsterSimulator;
  if (!Sim) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div class="output fail">Simulator core failed to load.</div>'
    );
    return;
  }

  var HISTORY_KEY = 'myzubster.sim.history.v1';
  var SELECTED_KEY = 'myzubster.sim.selected.v1';

  /** @type {{tag: object, createdAt: string}[]} */
  var history = loadHistory();
  var selectedIndex = parseInt(sessionStorage.getItem(SELECTED_KEY) || '-1', 10);

  var form = document.getElementById('registration-form');
  var generateBtn = document.getElementById('btn-generate');
  var sampleBtn = document.getElementById('btn-load-sample');
  var resetBtn = document.getElementById('btn-reset');
  var generateOut = document.getElementById('generate-output');

  var scanBtn = document.getElementById('btn-scan');
  var deviceName = document.getElementById('device-name');
  var scanOut = document.getElementById('scan-output');

  var verifyBtn = document.getElementById('btn-verify');
  var tamperToggle = document.getElementById('tamper-toggle');
  var verifyOut = document.getElementById('verify-output');

  var historyBody = document.querySelector('#tag-history tbody');
  var historyEmpty = document.getElementById('tag-history-empty');

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function persist() {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      sessionStorage.setItem(SELECTED_KEY, String(selectedIndex));
    } catch (e) { /* sessionStorage may be unavailable */ }
  }

  function readForm() {
    var fd = new FormData(form);
    var obj = {};
    fd.forEach(function (value, key) {
      if (value === '') return;
      obj[key] = value;
    });
    // age/weight may be empty strings; pass through only if non-empty.
    return obj;
  }

  function clearOutput(el) {
    el.hidden = false;
    el.classList.remove('ok', 'fail', 'warn');
    el.textContent = '';
  }

  function renderOutput(el, status, text) {
    clearOutput(el);
    el.classList.add(status);
    el.textContent = text;
  }

  function renderHistory() {
    historyBody.innerHTML = '';
    if (history.length === 0) {
      historyEmpty.hidden = false;
      scanBtn.disabled = true;
      verifyBtn.disabled = true;
      return;
    }
    historyEmpty.hidden = true;
    history.forEach(function (entry, idx) {
      var tr = document.createElement('tr');
      if (idx === selectedIndex) tr.classList.add('selected');
      var tagCell = document.createElement('td');
      tagCell.textContent = entry.tag.tagId;
      var animalCell = document.createElement('td');
      animalCell.textContent =
        entry.tag.payload.animal.commonName +
        ' (' + entry.tag.payload.animal.species + ')';
      var tsCell = document.createElement('td');
      tsCell.textContent = new Date(entry.createdAt).toLocaleString();
      var actCell = document.createElement('td');
      var selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.textContent = idx === selectedIndex ? 'Selected' : 'Select';
      selectBtn.className = 'secondary';
      selectBtn.addEventListener('click', function () {
        selectedIndex = idx;
        persist();
        renderHistory();
      });
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = 'Delete';
      delBtn.className = 'secondary';
      delBtn.style.marginLeft = '.25rem';
      delBtn.addEventListener('click', function () {
        history.splice(idx, 1);
        if (selectedIndex === idx) selectedIndex = history.length > 0 ? 0 : -1;
        else if (selectedIndex > idx) selectedIndex -= 1;
        persist();
        renderHistory();
      });
      actCell.appendChild(selectBtn);
      actCell.appendChild(delBtn);
      tr.appendChild(tagCell);
      tr.appendChild(animalCell);
      tr.appendChild(tsCell);
      tr.appendChild(actCell);
      historyBody.appendChild(tr);
    });
    scanBtn.disabled = selectedIndex < 0;
    verifyBtn.disabled = selectedIndex < 0;
  }

  generateBtn.addEventListener('click', function () {
    try {
      var reg = readForm();
      var tag = Sim.encodeNfcTag(reg);
      history.push({ tag: tag, createdAt: new Date().toISOString() });
      selectedIndex = history.length - 1;
      persist();
      renderHistory();
      renderOutput(generateOut, 'ok',
        'Tag generated successfully.\n' +
        'tagId: ' + tag.tagId + '\n' +
        'animalId: ' + tag.animalId + '\n' +
        'uri: ' + tag.uri + '\n' +
        'registryUrl: ' + tag.payload.registryUrl
      );
    } catch (err) {
      renderOutput(generateOut, 'fail', 'Generation failed: ' + err.message);
    }
  });

  sampleBtn.addEventListener('click', function () {
    form.species.value = 'Panthera leo';
    form.common_name.value = 'Lion';
    form.animal_type.value = 'wildlife';
    form.latitude.value = '-2.1533';
    form.longitude.value = '34.6857';
    form.age.value = '6';
    form.weight.value = '190';
    form.description.value = 'Adult lion observed in the Serengeti';
    form.xmr_address.value =
      '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A';
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    generateOut.hidden = true;
    scanOut.hidden = true;
    verifyOut.hidden = true;
  });

  scanBtn.addEventListener('click', function () {
    if (selectedIndex < 0) return;
    var entry = history[selectedIndex];
    var options = { device: deviceName.value || 'Web NFC Simulator' };
    try {
      var scan = Sim.simulateScan(entry.tag, options);
      var status = scan.verification.roundTripOk ? 'ok' : 'fail';
      renderOutput(scanOut, status,
        'Device: ' + scan.device + '\n' +
        'Timestamp: ' + scan.timestamp + '\n' +
        'tagId: ' + scan.tagId + '\n' +
        'uri: ' + scan.uri + '\n' +
        'schemaOk: ' + scan.verification.schemaOk + '\n' +
        'roundTripOk: ' + scan.verification.roundTripOk + '\n' +
        'payloadMatches: ' + scan.verification.payloadMatches + '\n' +
        'registryUrl: ' + scan.verification.registryUrl
      );
    } catch (err) {
      renderOutput(scanOut, 'fail', 'Scan failed: ' + err.message);
    }
  });

  verifyBtn.addEventListener('click', function () {
    if (selectedIndex < 0) return;
    var entry = history[selectedIndex];
    var options = { device: deviceName.value || 'Web NFC Simulator' };
    if (tamperToggle.checked) {
      // Simulate a registry mismatch: pretend the on-chain record points
      // at a different animal.
      options.expected = JSON.parse(JSON.stringify(entry.tag.payload));
      options.expected.animalId = 'animal_tampered000000000000';
    }
    try {
      var result = Sim.simulateVerification(entry.tag, options);
      var status = result.matches ? 'ok' : 'fail';
      renderOutput(verifyOut, status,
        'matches: ' + result.matches + '\n' +
        'scannedAnimalId: ' + result.scannedAnimalId + '\n' +
        'expectedAnimalId: ' + result.expectedAnimalId + '\n' +
        'registryUrl: ' + result.registryUrl + '\n' +
        'roundTripOk: ' + result.scan.verification.roundTripOk + '\n' +
        'checkedAt: ' + result.checkedAt +
        (result.matches
          ? '\n\n✔ Verification passed: scanned tag matches registry record.'
          : '\n\n✘ Verification failed: scanned tag does not match registry record.')
      );
    } catch (err) {
      renderOutput(verifyOut, 'fail', 'Verification failed: ' + err.message);
    }
  });

  renderHistory();
})();
