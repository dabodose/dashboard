// Initialize Firebase with your config
const firebaseConfig = {
  apiKey: "AIzaSyDuD-qTPsc9cBqqNVfO0Ur4wOaZnE4L6Cg",
  authDomain: "campaigndashboard-e8b96.firebaseapp.com",
  projectId: "campaigndashboard-e8b96",
  storageBucket: "campaigndashboard-e8b96.firebasestorage.app",
  messagingSenderId: "286098174856",
  appId: "1:286098174856:web:752334f3abbb3c5c31003d"
};

let db;
let isFirebaseInitialized = false;
let username;

// Global variables
let currentTab = 'tab1';
const tabs = ['tab1', 'tab2', 'tab3', 'tab4', 'tab5'];

// Get the current date in "Month Day" format (e.g., "May 27")
const today = new Date();
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const currentDate = `${monthNames[today.getMonth()]} ${today.getDate()}`;

// Default data
const defaultDays = [
  { date: currentDate, cost: 0, impressions: 0, clicks: 0, leads: 0, bookedCalls: 0, showedCalls: 0, conversions: 0, name: "", extraRows: [] }
];

// Firebase initialization
try {
  const app = firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  isFirebaseInitialized = true;
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error.message);
  alert(`Failed to initialize Firebase: ${error.message}. The dashboard will load with default data.`);
  isFirebaseInitialized = false;
}

// Get username from query parameter and load dashboard
const urlParams = new URLSearchParams(window.location.search);
username = urlParams.get('username') || 'defaultUser';
if (!urlParams.get('username')) {
  alert('No username provided. Using defaultUser. Please access this dashboard with a username parameter.');
}
initializeDashboard();

function initializeDashboard() {
  tabs.forEach(tab => {
    if (isFirebaseInitialized) {
      // Attempt to load data from Firestore
      db.collection('users').doc(username).collection('tabs').doc(tab).get()
        .then(doc => {
          if (!doc.exists && tab !== 'tab5') {
            // If no document exists and not Storage tab, initialize with default data
            const defaultData = { days: defaultDays, tabNames: { [tab]: `Tab ${tabs.indexOf(tab) + 1}` } };
            return db.collection('users').doc(username).collection('tabs').doc(tab)
              .set(defaultData)
              .then(() => {
                console.log(`Initialized default data for ${username}/${tab}`);
                renderTabData(tab, defaultDays);
                document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent = defaultData.tabNames[tab];
                if (tab === currentTab) {
                  updateCumulative(tab);
                }
              })
              .catch(error => {
                console.error(`Error initializing data for ${username}/${tab}:`, error.message);
                renderTabData(tab, defaultDays);
                document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent = `Tab ${tabs.indexOf(tab) + 1}`;
                if (tab === currentTab) {
                  updateCumulative(tab);
                }
              });
          } else if (tab === 'tab5') {
            // Load archived data for Storage tab
            loadArchivedData();
          } else {
            const data = doc.data();
            const days = (data && data.days) ? data.days : defaultDays;
            renderTabData(tab, days);
            document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent = (data && data.tabNames && data.tabNames[tab]) ? data.tabNames[tab] : `Tab ${tabs.indexOf(tab) + 1}`;
            if (tab === currentTab) {
              updateCumulative(tab);
            }
          }
        })
        .catch(error => {
          console.error(`Error loading data for ${username}/${tab}:`, error.message);
          if (tab !== 'tab5') {
            renderTabData(tab, defaultDays);
            document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent = `Tab ${tabs.indexOf(tab) + 1}`;
            if (tab === currentTab) {
              updateCumulative(tab);
            }
          }
        })
        .finally(() => {
          if (isFirebaseInitialized && tab !== 'tab5') {
            db.collection('users').doc(username).collection('tabs').doc(tab)
              .onSnapshot(doc => {
                const data = doc.data();
                const days = (data && data.days) ? data.days : defaultDays;
                renderTabData(tab, days);
                if (data && data.tabNames && data.tabNames[tab]) {
                  document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent = data.tabNames[tab];
                }
                if (tab === currentTab) {
                  updateCumulative(tab);
                }
              }, error => {
                console.error(`Snapshot error for ${username}/${tab}:`, error.message);
                renderTabData(tab, defaultDays);
                if (tab === currentTab) {
                  updateCumulative(tab);
                }
              });
          }
        });
    } else {
      if (tab !== 'tab5') {
        renderTabData(tab, defaultDays);
        document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent = `Tab ${tabs.indexOf(tab) + 1}`;
        if (tab === currentTab) {
          updateCumulative(tab);
        }
      } else {
        loadArchivedData();
      }
    }
  });
}

function editTabName(tab) {
  const tabIndex = tabs.indexOf(tab) + 1;
  if (tab === 'tab5') return; // Prevent editing Storage tab

  const span = document.getElementById(`tabName${tabIndex}`);
  const currentName = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.style.width = '100%';
  input.style.textAlign = 'center';
  input.style.backgroundColor = '#4A4A4A';
  input.style.color = '#FFFFFF';
  input.style.border = 'none';
  input.style.padding = '0';
  input.style.fontSize = '16px';
  input.onblur = () => saveTabName(tab, input);
  input.onkeypress = (e) => { if (e.key === 'Enter') saveTabName(tab, input); };

  span.replaceWith(input);
  input.focus();
}

function saveTabName(tab, input) {
  const tabIndex = tabs.indexOf(tab) + 1;
  const newName = input.value.trim() || `Tab ${tabIndex}`;
  const span = document.createElement('span');
  span.id = `tabName${tabIndex}`;
  span.textContent = newName;
  span.ondblclick = () => editTabName(tab);
  input.replaceWith(span);

  if (isFirebaseInitialized) {
    db.collection('users').doc(username).collection('tabs').doc(tab).update({
      [`tabNames.${tab}`]: newName
    })
    .catch(error => console.error(`Error updating tab name for ${username}/${tab}:`, error.message));
  }
}

function renderTabData(tab, days) {
  const tbody = document.getElementById(`tbody${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  if (!tbody) return;
  tbody.innerHTML = '';
  if (tab === 'tab5') {
    // Storage tab rendering handled by loadArchivedData
    return;
  }
  days.forEach((day, index) => {
    const row = document.createElement('tr');
    const cpm = day.impressions ? `$${(day.cost / day.impressions * 1000).toFixed(2)}` : '—';
    const ctr = day.impressions ? `${(day.clicks / day.impressions * 100).toFixed(2)}%` : '—';
    const onChangeHandler = isFirebaseInitialized ? `updateFirestore('${tab}', ${index})` : `updateCumulative('${tab}')`;
    const nameDisabled = day.bookedCalls === 0;
    const nameValue = day.bookedCalls === 0 ? '' : (day.name || '');
    const isEmpty = !day.cost && !day.impressions && !day.clicks && !day.leads && !day.bookedCalls && !day.showedCalls && !day.conversions && !day.name;
    row.innerHTML = `
      <td><input type="text" class="date-input" id="dateDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.date}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" id="costDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.cost || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" class="calculated" readonly value="${cpm}"></td>
      <td><input type="text" id="impressionsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.impressions || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" class="calculated" readonly value="${ctr}"></td>
      <td><input type="text" id="clicksDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.clicks || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" id="leadsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.leads || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" id="bookedCallsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.bookedCalls || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" id="showedCallsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.showedCalls || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td><input type="text" id="conversionsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${day.conversions || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
      <td>
        ${nameDisabled ? '—' : `
          <input type="text" class="name-input" id="nameDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${nameValue}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();">
        `}
      </td>
      <td><button class="delete-btn" onclick="deleteRow('${tab}', ${index})" style="${isEmpty ? 'display: inline;' : 'display: none;'}">X</button></td>
    `;
    tbody.appendChild(row);

    if (day.bookedCalls > 1) {
      for (let i = 1; i < day.bookedCalls; i++) {
        const extraRow = document.createElement('tr');
        const extraData = day.extraRows && day.extraRows[i - 1] ? day.extraRows[i - 1] : { showedCalls: 0, conversions: 0, name: '' };
        extraRow.innerHTML = `
          <td><hr class="derived-line"></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td><input type="text" id="extraShowedCallsDay${index + 1}_${i}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${extraData.showedCalls || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
          <td><input type="text" id="extraConversionsDay${index + 1}_${i}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${extraData.conversions || 0}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
          <td>
            <input type="text" class="name-input" id="extraNameDay${index + 1}_${i}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${extraData.name || ''}" onchange="${onChangeHandler}" onkeypress="if(event.key === 'Enter') this.onchange();">
          </td>
          <td></td>
        `;
        tbody.appendChild(extraRow);
      }
    }
  });
}

function updateFirestore(tab, dayIndex) {
  if (!isFirebaseInitialized || tab === 'tab5') return;

  const date = document.getElementById(`dateDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value;
  const cost = parseFloat(document.getElementById(`costDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const impressions = parseFloat(document.getElementById(`impressionsDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const clicks = parseFloat(document.getElementById(`clicksDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const leads = parseFloat(document.getElementById(`leadsDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const bookedCalls = parseFloat(document.getElementById(`bookedCallsDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const showedCalls = parseFloat(document.getElementById(`showedCallsDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const conversions = parseFloat(document.getElementById(`conversionsDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
  const name = bookedCalls === 0 ? '' : (document.getElementById(`nameDay${dayIndex + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.value || '');

  db.collection('users').doc(username).collection('tabs').doc(tab).get()
    .then(doc => {
      let days = doc.exists && doc.data().days ? doc.data().days : defaultDays;
      if (days[dayIndex]) {
        days[dayIndex] = {
          date: date,
          cost: cost,
          impressions: impressions,
          clicks: clicks,
          leads: leads,
          bookedCalls: bookedCalls,
          showedCalls: showedCalls,
          conversions: conversions,
          name: bookedCalls >= 1 ? name : "",
          extraRows: days[dayIndex].extraRows || []
        };

        if (bookedCalls <= 1) {
          days[dayIndex].extraRows = [];
        } else {
          const newExtraRows = [];
          for (let i = 1; i < bookedCalls; i++) {
            const extraShowedCalls = parseFloat(document.getElementById(`extraShowedCallsDay${dayIndex + 1}_${i}${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.value) || 0;
            const extraConversions = parseFloat(document.getElementById(`extraConversionsDay${dayIndex + 1}_${i}${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.value) || 0;
            const extraName = document.getElementById(`extraNameDay${dayIndex + 1}_${i}${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.value || '';
            newExtraRows[i - 1] = { showedCalls: extraShowedCalls, conversions: extraConversions, name: extraName };
          }
          days[dayIndex].extraRows = newExtraRows;
        }

        return db.collection('users').doc(username).collection('tabs').doc(tab).set({ days }, { merge: true })
          .then(() => {
            console.log(`Updated day ${dayIndex} for ${username}/${tab}`);
            if (tab === currentTab) {
              updateCumulative(tab);
            }
          })
          .catch(error => {
            console.error(`Firestore update error for ${username}/${tab}, day ${dayIndex}:`, error.message);
          });
      }
    })
    .catch(error => {
      console.error(`Firestore get error for ${username}/${tab}:`, error.message);
    });
}

function deleteRow(tab, dayIndex) {
  if (tab === 'tab5' || !isFirebaseInitialized) return;

  db.collection('users').doc(username).collection('tabs').doc(tab).get()
    .then(doc => {
      if (doc.exists) {
        const days = doc.data().days || [];
        if (days[dayIndex]) {
          days.splice(dayIndex, 1);
          return db.collection('users').doc(username).collection('tabs').doc(tab).update({ days })
            .then(() => {
              console.log(`Deleted day ${dayIndex} for ${username}/${tab}`);
              if (tab === currentTab) {
                updateCumulative(tab);
              }
            })
            .catch(error => {
              console.error(`Error deleting row for ${username}/${tab}, day ${dayIndex}:`, error.message);
            });
        }
      }
    })
    .catch(error => {
      console.error(`Firestore get error for deleteRow ${username}/${tab}:`, error.message);
    });
}

function addNewDay(tab) {
  if (tab === 'tab5' || !isFirebaseInitialized) return;

  db.collection('users').doc(username).collection('tabs').doc(tab).get()
    .then(doc => {
      let days = doc.exists && doc.data().days ? doc.data().days : defaultDays;
      const lastDate = days.length > 0 ? days[days.length - 1].date : currentDate;
      const [month, day] = lastDate.split(' ');
      const lastDayNum = parseInt(day) || 0;
      const newDate = `${month} ${lastDayNum + 1}`;
      const newDay = {
        date: newDate,
        cost: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        bookedCalls: 0,
        showedCalls: 0,
        conversions: 0,
        name: "",
        extraRows: []
      };
      days.push(newDay);
      return db.collection('users').doc(username).collection('tabs').doc(tab)
        .set({ days }, { merge: true })
        .then(() => {
          console.log(`Successfully added new day for ${username}/${tab}: ${newDate}`);
          renderTabData(tab, days);
          if (tab === currentTab) {
            updateCumulative(tab);
          }
        })
        .catch(error => {
          console.error(`Error adding new day for ${username}/${tab}:`, error.message);
          alert(`Failed to add new day: ${error.message}. Falling back to local update.`);
          const tbody = document.getElementById(`tbody${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
          const rows = tbody.getElementsByTagName('tr');
          const lastDate = rows.length > 0 ? rows[rows.length - 1].cells[0].querySelector('input').value : currentDate;
          const [month, day] = lastDate.split(' ');
          const lastDayNum = parseInt(day) || 0;
          const newDate = `${month} ${lastDayNum + 1}`;
          const index = rows.length;
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><input type="text" class="date-input" id="dateDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="${newDate}" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" id="costDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" class="calculated" readonly value="—" title="Calculated as (Cost / Impressions) * 1000"></td>
            <td><input type="text" id="impressionsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" class="calculated" readonly value="—" title="Calculated as (Clicks / Impressions) * 100"></td>
            <td><input type="text" id="clicksDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" id="leadsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" id="bookedCallsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" id="showedCallsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td><input type="text" id="conversionsDay${index + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}" value="0" onchange="updateFirestore('${tab}', ${index})" onkeypress="if(event.key === 'Enter') this.onchange();"></td>
            <td>—</td>
            <td><button class="delete-btn" onclick="deleteRow('${tab}', ${index})">X</button></td>
          `;
          tbody.appendChild(row);
          updateCumulative(tab);
        });
    })
    .catch(error => {
      console.error(`Error fetching tab data for adding new day ${username}/${tab}:`, error.message);
    });
}

function openTab(tabName) {
  currentTab = tabName;
  const tabContents = document.getElementsByClassName('tab-content');
  const tabButtons = document.getElementsByClassName('tab-button');
  const metricsContainer = document.getElementById('metrics-container');
  
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].classList.remove('active');
    tabButtons[i].classList.remove('active');
  }
  document.getElementById(tabName).classList.add('active');
  document.getElementsByClassName('tab-button')[tabs.indexOf(tabName)].classList.add('active');
  
  // Hide metrics container and titles for Storage tab, show for others
  if (tabName === 'tab5') {
    metricsContainer.style.display = 'none';
    document.querySelectorAll('h2').forEach(h2 => h2.style.display = 'none');
  } else {
    metricsContainer.style.display = 'flex';
    document.querySelectorAll('h2').forEach(h2 => h2.style.display = 'block');
    updateCumulative(tabName);
  }
  
  // Show/hide the Store button based on the current tab
  const storeBtn = document.querySelector('.store-btn');
  storeBtn.style.display = (tabName === 'tab5') ? 'none' : 'block';
}

function updateCumulative(tab) {
  if (tab === 'tab5') return;

  if (isFirebaseInitialized) {
    db.collection('users').doc(username).collection('tabs').doc(tab).get()
      .then(doc => {
        if (doc.exists) {
          const days = doc.data().days || defaultDays;
          let totalImpressions = 0, totalClicks = 0, totalLeads = 0, totalBookedCalls = 0, totalShowedCalls = 0, totalCost = 0, totalConversions = 0;
          let hasData = false;

          days.forEach(day => {
            totalImpressions += day.impressions || 0;
            totalClicks += day.clicks || 0;
            totalLeads += day.leads || 0;
            totalBookedCalls += day.bookedCalls || 0;
            totalShowedCalls += day.showedCalls || 0;
            totalCost += day.cost || 0;
            totalConversions += day.conversions || 0;
            if (day.extraRows) {
              day.extraRows.forEach(extra => {
                totalShowedCalls += extra.showedCalls || 0;
                totalConversions += extra.conversions || 0;
              });
            }
            if (day.cost || day.impressions || day.clicks || day.leads || day.bookedCalls || day.showedCalls || day.conversions) {
              hasData = true;
            }
          });

          const metricBoxes = document.getElementsByClassName('metric-box');
          for (let box of metricBoxes) {
            box.style.display = hasData ? 'flex' : 'none';
          }

          const ctr = totalImpressions ? (totalClicks / totalImpressions * 100).toFixed(1) : 0;
          const cpc = totalClicks ? (totalCost / totalClicks).toFixed(1) : 0;
          const conversionRate = totalClicks ? (totalLeads / totalClicks * 100).toFixed(1) : 0;
          const cpl = totalLeads ? (totalCost / totalLeads).toFixed(1) : 0;
          const bookingConversionRate = totalLeads ? (totalBookedCalls / totalLeads * 100).toFixed(1) : 0;
          const costPerBookedCall = totalBookedCalls ? (totalCost / totalBookedCalls).toFixed(1) : 0;
          const showRate = totalBookedCalls ? (totalShowedCalls / totalBookedCalls * 100).toFixed(1) : 0;
          const costPerShowedCall = totalShowedCalls ? (totalCost / totalShowedCalls).toFixed(1) : 0;
          const costPerConversion = totalConversions ? (totalCost / totalConversions).toFixed(1) : 0;
          const conversionCR = totalShowedCalls ? (totalConversions / totalShowedCalls * 100).toFixed(1) : 0;

          document.getElementById('cumulativeClicks').innerText = totalClicks;
          document.getElementById('cumulativeCTR').innerText = `${ctr}%`;
          document.getElementById('cumulativeCPC').innerText = `$${cpc}`;
          document.getElementById('cumulativeLeads').innerText = totalLeads;
          document.getElementById('cumulativeCPL').innerText = `$${cpl}`;
          document.getElementById('cumulativeConversionRate').innerText = `${conversionRate}%`;
          document.getElementById('cumulativeBookedCalls').innerText = totalBookedCalls;
          document.getElementById('cumulativeCostPerBookedCall').innerText = `$${costPerBookedCall}`;
          document.getElementById('cumulativeBookingConversionRate').innerText = `${bookingConversionRate}%`;
          document.getElementById('cumulativeShowedCalls').innerText = totalShowedCalls;
          document.getElementById('cumulativeCostPerShowedCall').innerText = `$${costPerShowedCall}`;
          document.getElementById('cumulativeShowRate').innerText = `${showRate}%`;
          document.getElementById('cumulativeConversions').innerText = totalConversions;
          document.getElementById('cumulativeCostPerConversion').innerText = `$${costPerConversion}`;
          document.getElementById('cumulativeConversionCR').innerText = `${conversionCR}%`;
        }
      })
      .catch(error => {
        console.error(`Cumulative update error for ${username}/${tab}:`, error.message);
        renderTabData(tab, defaultDays);
      });
  } else {
    const tbody = document.getElementById(`tbody${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    const rows = tbody.getElementsByTagName('tr');
    let totalImpressions = 0, totalClicks = 0, totalLeads = 0, totalBookedCalls = 0, totalShowedCalls = 0, totalCost = 0, totalConversions = 0;
    let hasData = false;

    for (let i = 0; i < rows.length; i++) {
      const bookedCalls = parseFloat(document.getElementById(`bookedCallsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
      totalImpressions += parseFloat(document.getElementById(`impressionsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
      totalClicks += parseFloat(document.getElementById(`clicksDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
      totalLeads += parseFloat(document.getElementById(`leadsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
      totalBookedCalls += bookedCalls;
      totalShowedCalls += parseFloat(document.getElementById(`showedCallsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
      totalCost += parseFloat(document.getElementById(`costDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;
      totalConversions += parseFloat(document.getElementById(`conversionsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) || 0;

      if (document.getElementById(`costDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value ||
          document.getElementById(`impressionsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value ||
          document.getElementById(`clicksDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value ||
          document.getElementById(`leadsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value ||
          document.getElementById(`bookedCallsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value ||
          document.getElementById(`showedCallsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value ||
          document.getElementById(`conversionsDay${i + 1}${tab.charAt(0).toUpperCase() + tab.slice(1)}`).value) {
        hasData = true;
      }

      for (let j = 1; j < bookedCalls; j++) {
        totalShowedCalls += parseFloat(document.getElementById(`extraShowedCallsDay${i + 1}_${j}${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.value || 0);
        totalConversions += parseFloat(document.getElementById(`extraConversionsDay${i + 1}_${j}${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.value || 0);
      }
    }

    const metricBoxes = document.getElementsByClassName('metric-box');
    for (let box of metricBoxes) {
      box.style.display = hasData ? 'flex' : 'none';
    }

    const ctr = totalImpressions ? (totalClicks / totalImpressions * 100).toFixed(1) : 0;
    const cpc = totalClicks ? (totalCost / totalClicks).toFixed(1) : 0;
    const conversionRate = totalClicks ? (totalLeads / totalClicks * 100).toFixed(1) : 0;
    const cpl = totalLeads ? (totalCost / totalLeads).toFixed(1) : 0;
    const bookingConversionRate = totalLeads ? (totalBookedCalls / totalLeads * 100).toFixed(1) : 0;
    const costPerBookedCall = totalBookedCalls ? (totalCost / totalBookedCalls).toFixed(1) : 0;
    const showRate = totalBookedCalls ? (totalShowedCalls / totalBookedCalls * 100).toFixed(1) : 0;
    const costPerShowedCall = totalShowedCalls ? (totalCost / totalShowedCalls).toFixed(1) : 0;
    const costPerConversion = totalConversions ? (totalCost / totalConversions).toFixed(1) : 0;
    const conversionCR = totalShowedCalls ? (totalConversions / totalShowedCalls * 100).toFixed(1) : 0;

    document.getElementById('cumulativeClicks').innerText = totalClicks;
    document.getElementById('cumulativeCTR').innerText = `${ctr}%`;
    document.getElementById('cumulativeCPC').innerText = `$${cpc}`;
    document.getElementById('cumulativeLeads').innerText = totalLeads;
    document.getElementById('cumulativeCPL').innerText = `$${cpl}`;
    document.getElementById('cumulativeConversionRate').innerText = `${conversionRate}%`;
    document.getElementById('cumulativeBookedCalls').innerText = totalBookedCalls;
    document.getElementById('cumulativeCostPerBookedCall').innerText = `$${costPerBookedCall}`;
    document.getElementById('cumulativeBookingConversionRate').innerText = `${bookingConversionRate}%`;
    document.getElementById('cumulativeShowedCalls').innerText = totalShowedCalls;
    document.getElementById('cumulativeCostPerShowedCall').innerText = `$${costPerShowedCall}`;
    document.getElementById('cumulativeShowRate').innerText = `${showRate}%`;
    document.getElementById('cumulativeConversions').innerText = totalConversions;
    document.getElementById('cumulativeCostPerConversion').innerText = `$${costPerConversion}`;
    document.getElementById('cumulativeConversionCR').innerText = `${conversionCR}%`;
  }
}

function storeTab(tab) {
  if (tab === 'tab5' || !isFirebaseInitialized) return;

  db.collection('users').doc(username).collection('tabs').doc(tab).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const days = data.days || defaultDays;
        const tabName = document.getElementById(`tabName${tabs.indexOf(tab) + 1}`).textContent || `Tab ${tabs.indexOf(tab) + 1}`;
        const timestamp = new Date().toLocaleString();
        const archiveId = `${tab}_${Date.now()}`; // Unique ID based on tab and timestamp

        // Archive the data
        return db.collection('users').doc(username).collection('archivedTabs').doc(archiveId).set({
          tab: tab,
          tabName: tabName,
          days: days,
          timestamp: timestamp
        })
        .then(() => {
          console.log(`Archived ${tab} for ${username} with ID ${archiveId}`);
          // Reset to default data
          return db.collection('users').doc(username).collection('tabs').doc(tab).set({
            days: defaultDays,
            tabNames: { [tab]: tabName }
          })
          .then(() => {
            renderTabData(tab, defaultDays);
            updateCumulative(tab);
            if (currentTab === 'tab5') {
              loadArchivedData();
            }
          })
          .catch(error => {
            console.error(`Error resetting tab ${tab} for ${username}:`, error.message);
            alert(`Failed to reset tab after storing: ${error.message}. Falling back to local reset.`);
            const tbody = document.getElementById(`tbody${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
            tbody.innerHTML = '';
            renderTabData(tab, defaultDays);
            updateCumulative(tab);
          });
        })
        .catch(error => {
          console.error(`Error storing tab ${tab} for ${username}:`, error.message);
          alert(`Failed to store tab: ${error.message}. Falling back to local reset.`);
          const tbody = document.getElementById(`tbody${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
          tbody.innerHTML = '';
          renderTabData(tab, defaultDays);
          updateCumulative(tab);
        });
      }
    })
    .catch(error => {
      console.error(`Error fetching tab ${tab} for ${username}:`, error.message);
      alert(`Failed to store tab: ${error.message}. Falling back to local reset.`);
      const tbody = document.getElementById(`tbody${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      tbody.innerHTML = '';
      renderTabData(tab, defaultDays);
      updateCumulative(tab);
    });
}

function deleteArchivedData(archiveId) {
  if (!isFirebaseInitialized) return;

  db.collection('users').doc(username).collection('archivedTabs').doc(archiveId).delete()
    .then(() => {
      console.log(`Deleted archived data with ID ${archiveId} for ${username}`);
      loadArchivedData(); // Refresh the Storage tab
    })
    .catch(error => {
      console.error(`Error deleting archived data with ID ${archiveId} for ${username}:`, error.message);
      alert(`Failed to delete archived data: ${error.message}`);
    });
}

function loadArchivedData() {
  const storageContent = document.getElementById('storageContent');
  if (!storageContent) return;

  if (isFirebaseInitialized) {
    db.collection('users').doc(username).collection('archivedTabs')
      .get()
      .then(querySnapshot => {
        storageContent.innerHTML = '';
        querySnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`Archived data for ${data.tabName}:`, data); // Debugging log

          // Check if data.days exists and is an array; if not, provide a fallback
          const days = Array.isArray(data.days) && data.days.length > 0 ? data.days : [];

          // Calculate cumulative metrics for this archived dataset
          let totalImpressions = 0, totalClicks = 0, totalLeads = 0, totalBookedCalls = 0, totalShowedCalls = 0, totalCost = 0, totalConversions = 0;
          let hasData = false;

          days.forEach(day => {
            totalImpressions += day.impressions || 0;
            totalClicks += day.clicks || 0;
            totalLeads += day.leads || 0;
            totalBookedCalls += day.bookedCalls || 0;
            totalShowedCalls += day.showedCalls || 0;
            totalCost += day.cost || 0;
            totalConversions += day.conversions || 0;
            if (day.extraRows) {
              day.extraRows.forEach(extra => {
                totalShowedCalls += extra.showedCalls || 0;
                totalConversions += extra.conversions || 0;
              });
            }
            if (day.cost || day.impressions || day.clicks || day.leads || day.bookedCalls || day.showedCalls || day.conversions) {
              hasData = true;
            }
          });

          const ctr = totalImpressions ? (totalClicks / totalImpressions * 100).toFixed(1) : 0;
          const cpc = totalClicks ? (totalCost / totalClicks).toFixed(1) : 0;
          const conversionRate = totalClicks ? (totalLeads / totalClicks * 100).toFixed(1) : 0;
          const cpl = totalLeads ? (totalCost / totalLeads).toFixed(1) : 0;
          const bookingConversionRate = totalLeads ? (totalBookedCalls / totalLeads * 100).toFixed(1) : 0;
          const costPerBookedCall = totalBookedCalls ? (totalCost / totalBookedCalls).toFixed(1) : 0;
          const showRate = totalBookedCalls ? (totalShowedCalls / totalBookedCalls * 100).toFixed(1) : 0;
          const costPerShowedCall = totalShowedCalls ? (totalCost / totalShowedCalls).toFixed(1) : 0;
          const costPerConversion = totalConversions ? (totalCost / totalConversions).toFixed(1) : 0;
          const conversionCR = totalShowedCalls ? (totalConversions / totalShowedCalls * 100).toFixed(1) : 0;

          const archiveId = doc.id; // Unique ID for this archive to avoid DOM conflicts

          const details = document.createElement('details');
          details.innerHTML = `
            <summary>
              <span>${data.tabName || 'Unknown Tab'} - ${data.timestamp || 'Unknown Date'}</span>
              <button class="delete-archive-btn" onclick="deleteArchivedData('${archiveId}')">Delete</button>
            </summary>
            ${days.length > 0 ? `
              <div class="metrics-container">
                <div class="metric-box ctr-box" style="display: ${hasData ? 'flex' : 'none'};">
                  <div>Clicks: <span id="archiveClicks${archiveId}">${totalClicks}</span></div>
                  <div>CPC: <span id="archiveCPC${archiveId}">$${cpc}</span></div>
                  <div>CTR: <span id="archiveCTR${archiveId}">${ctr}%</span></div>
                </div>
                <div class="metric-box leads-box" style="display: ${hasData ? 'flex' : 'none'};">
                  <div>Leads: <span id="archiveLeads${archiveId}">${totalLeads}</span></div>
                  <div>CPL: <span id="archiveCPL${archiveId}">$${cpl}</span></div>
                  <div>CR: <span id="archiveConversionRate${archiveId}">${conversionRate}%</span></div>
                </div>
                <div class="metric-box booked-calls-box" style="display: ${hasData ? 'flex' : 'none'};">
                  <div>Booked Calls: <span id="archiveBookedCalls${archiveId}">${totalBookedCalls}</span></div>
                  <div>Cost: <span id="archiveCostPerBookedCall${archiveId}">$${costPerBookedCall}</span></div>
                  <div>CR: <span id="archiveBookingConversionRate${archiveId}">${bookingConversionRate}%</span></div>
                </div>
                <div class="metric-box showed-calls-box" style="display: ${hasData ? 'flex' : 'none'};">
                  <div>Showed Calls: <span id="archiveShowedCalls${archiveId}">${totalShowedCalls}</span></div>
                  <div>Cost: <span id="archiveCostPerShowedCall${archiveId}">$${costPerShowedCall}</span></div>
                  <div>CR: <span id="archiveShowRate${archiveId}">${showRate}%</span></div>
                </div>
                <div class="metric-box conversions-box" style="display: ${hasData ? 'flex' : 'none'};">
                  <div>Sales: <span id="archiveConversions${archiveId}">${totalConversions}</span></div>
                  <div>Cost: <span id="archiveCostPerConversion${archiveId}">$${costPerConversion}</span></div>
                  <div>CR: <span id="archiveConversionCR${archiveId}">${conversionCR}%</span></div>
                </div>
              </div>
              <div class="daily-inputs">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Cost ($)</th>
                      <th>CPM</th>
                      <th>Imp.</th>
                      <th>CTR</th>
                      <th>Clicks</th>
                      <th>Leads</th>
                      <th>Booked Calls</th>
                      <th>Showed Calls</th>
                      <th>Sales</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${days.map((day, index) => {
                      const cpm = day.impressions ? `$${(day.cost / day.impressions * 1000).toFixed(2)}` : '—';
                      const ctr = day.impressions ? `${(day.clicks / day.impressions * 100).toFixed(2)}%` : '—';
                      return `
                        <tr>
                          <td>${day.date || '—'}</td>
                          <td>${day.cost || 0}</td>
                          <td><input type="text" class="calculated" readonly value="${cpm}"></td>
                          <td>${day.impressions || 0}</td>
                          <td><input type="text" class="calculated" readonly value="${ctr}"></td>
                          <td>${day.clicks || 0}</td>
                          <td>${day.leads || 0}</td>
                          <td>${day.bookedCalls || 0}</td>
                          <td>${day.showedCalls || 0}</td>
                          <td>${day.conversions || 0}</td>
                          <td>${day.name || '—'}</td>
                        </tr>
                        ${(Array.isArray(day.extraRows) ? day.extraRows : []).map((extra, i) => `
                          <tr>
                            <td><hr class="derived-line"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>${extra.showedCalls || 0}</td>
                            <td>${extra.conversions || 0}</td>
                            <td>${extra.name || ''}</td>
                          </tr>
                        `).join('')}
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p>No data available for this archive.</p>'}
          `;
          storageContent.appendChild(details);
        });
        if (querySnapshot.empty) {
          storageContent.innerHTML = '<p>No archived data available.</p>';
        }
      })
      .catch(error => {
        console.error(`Error loading archived data for ${username}:`, error.message);
        storageContent.innerHTML = `<p>Failed to load archived data: ${error.message}</p>`;
      });
  } else {
    storageContent.innerHTML = '<p>No archived data available (Firebase not initialized).</p>';
  }
}
