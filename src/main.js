import Chart from 'chart.js/auto';
import 'chartjs-adapter-luxon';

const progressBar = document.getElementById('progress-bar');
const progressBarPercentText = document.getElementById('progress-bar-percent-text');
const progressBarNumberText = document.getElementById('progress-bar-number-text');

const addDebtButton = document.getElementById('add-debt-button');
const removeDebtButton = document.getElementById('remove-debt-button');

const logContainer = document.getElementById('log-container');

const loadingScreen = document.getElementById('loading-screen');

const fullLogButton = document.getElementById('full-log-button');

const cacheExpirationTime = 2 * 60 * 1000;
const initialDebt = 258;
const debtLogLength = 15;

let displayFullLog = false;

window.addEventListener('DOMContentLoaded', () => {
    main();
});

function main() {
    fetchDebt();

    addDebtButton.addEventListener('click', addDebt);
    removeDebtButton.addEventListener('click', removeDebt);
};

function updateSite(data) {
    calculateDebt(data);
    buildLog(data);
    buildChart(data);

    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 100);
}

async function fetchDebt() {
    const cachedDebt = localStorage.getItem('debtData');
    const cachedDebtTime = localStorage.getItem('debtDataTime');

    if (cachedDebt && cachedDebtTime && Date.now() - cachedDebtTime < cacheExpirationTime) {
        const parsedDebt = JSON.parse(cachedDebt);
        updateSite(parsedDebt);


        fullLogButton.addEventListener('click', () => {
            displayFullLog = !displayFullLog;
            buildLog(parsedDebt);
        });
    }
    else {
        try {
            const response = await fetch('/.netlify/functions/fetch-debt');
            const data = await response.json();

            localStorage.setItem('debtData', JSON.stringify(data));
            localStorage.setItem('debtDataTime', Date.now().toString());

            fullLogButton.addEventListener('click', () => {
                displayFullLog = !displayFullLog;
                buildLog(data);
            });

            updateSite(data);
        } catch (error) {
            console.error('Error fetching debt:', error);
            loadingScreen.textContent = 'Error loading content, please try again later.';
        }
    }
}

function calculateDebt(debt) {
    let debtAdded = 0;
    let debtPayed = 0;

    debt.debt.forEach(entry => {
        if (entry.amount > 0) {
            debtAdded += entry.amount;
        }
        else {
            debtPayed += entry.amount;
        }
    });

    const percentComplete = ((Math.abs(debtPayed) / (initialDebt + debtAdded)) * 100).toFixed(1);

    progressBar.style.width = (percentComplete + '%').toString();
    progressBarPercentText.textContent = ('I am ' + percentComplete + '% Free!').toString();
    progressBarNumberText.textContent = (Math.abs(debtPayed) + '/' + (initialDebt + debtAdded) + ' Games Completed').toString();
}

function buildLog(data) {
    const rows = logContainer.querySelectorAll('tr');
    rows.forEach((row, index) => {
        if (index !== 0) row.remove();
    });

    const redColor = '#eb4034';
    const greenColor = '#34eb3a';

    const sortedData = [...data.debt].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let debtLogCounter = 0;
    let supportGameEntries = [];
    let randomBetEntries = [];

    const rowsToInsert = [];

    sortedData.forEach(entry => {
        if (entry.description === 'Played Support Game.') {
            supportGameEntries.push(entry);
            return;
        }

        if (entry.description == 'Random Number Gen Bet.') {
            randomBetEntries.push(entry);
            return;
        }

        if (debtLogCounter >= debtLogLength && !displayFullLog) {
            return;
        }

        const tableRow = document.createElement('tr');

        const amountData = document.createElement('td');
        const gameText = Math.abs(entry.amount) === 1 ? 'Game' : 'Games';
        amountData.textContent = `${entry.amount > 0 ? '+' : ''}${entry.amount} ${gameText}`;
        amountData.style.color = entry.amount > 0 ? redColor : greenColor;
        tableRow.append(amountData);

        const descriptionData = document.createElement('td');
        descriptionData.textContent = entry.description;
        descriptionData.style.textTransform = 'capitalize';
        tableRow.append(descriptionData);

        const dateData = document.createElement('td');
        const date = new Date(entry.created_at);
        const options = { year: 'numeric', month: 'long', day: '2-digit' };
        dateData.textContent = date.toLocaleDateString(undefined, options);
        tableRow.append(dateData);

        rowsToInsert.push(tableRow);
        debtLogCounter++;
    });

    function combineEntries(entries, descriptionText) {
        if (entries.length === 0) return;
    
        let amount = 0;
        entries.forEach(entry => {
            amount += entry.amount;
        });
    
        const tableRow = document.createElement('tr');
    
        const amountData = document.createElement('td');
        const gameText = Math.abs(amount) === 1 ? 'Game' : 'Games';
        amountData.textContent = `${amount > 0 ? '+' : ''}${amount} ${gameText}`;
        amountData.style.color = amount > 0 ? redColor : greenColor;
        tableRow.append(amountData);
    
        const descriptionData = document.createElement('td');
        descriptionData.textContent = descriptionText;
        descriptionData.style.textTransform = 'capitalize';
        tableRow.append(descriptionData);
    
        const dateData = document.createElement('td');
        dateData.textContent = '---';
        tableRow.append(dateData);
    
        logContainer.insertBefore(tableRow, logContainer.rows[1]);
    }
    
    combineEntries(randomBetEntries, `Ran Random Number Gen ${randomBetEntries.length} Times.`);
    combineEntries(supportGameEntries, `Played ${supportGameEntries.length} Support Games.`);

    rowsToInsert.forEach(row => logContainer.appendChild(row));
}

function buildChart(data) {
    const sorted = data.debt.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let gamesLeft = 0;
    let gamesPlayed = 0;

    const chartData = sorted.map(entry => {
        entry.amount > 0 ? gamesLeft += entry.amount : gamesPlayed += Math.abs(entry.amount);

        return {
            x: entry.created_at,
            y: (initialDebt + gamesLeft) - gamesPlayed,
            description: entry.description,
            amount: entry.amount
        };
    });

    new Chart(document.getElementById('debt-chart'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Games Remaining',
                data: chartData,
                borderColor: '#c89b3c',
                backgroundColor: '#d6ae5934',
                fill: true,
                tension: 0.2,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointBackgroundColor: '#c89b3c',
                pointBorderColor: '#c89b3c'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Game Remaining Over Time'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const line1 = `${context.raw.y} games remaining`;
                            const line2 = `Reason: ${context.raw.description}`;
                            const line3 = `Amount: ${context.raw.amount}`;
                            return [line1, line2, line3];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'DD T'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Games Remaining'
                    }
                }
            }
        }
    });
}

async function addDebt() {
    if (localStorage.getItem('voted')) {
        alert('You have already made a change to the debt!');
        return;
    };

    const response = await fetch('/.netlify/functions/add-debt');
    const data = await response.json();

    if (!response.ok && response.status === 403) {
        localStorage.setItem('voted', true);
    }

    alert(data.message);

    localStorage.clear('debtData');
    localStorage.clear('debtDataTime');
}

async function removeDebt() {
    if (localStorage.getItem('voted')) {
        alert('You have already made a change to the debt!');
        return;
    };

    const response = await fetch('/.netlify/functions/remove-debt');
    const data = await response.json();

    if (!response.ok && response.status === 403) {
        localStorage.setItem('voted', true);
    }

    alert(data.message);

    localStorage.clear('debtData');
    localStorage.clear('debtDataTime');
}