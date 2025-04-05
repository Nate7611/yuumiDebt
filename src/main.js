import Chart from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { DateTime } from 'luxon';

const progressBarElement = document.getElementById('progress-bar');
const progressBarPercentTextElement = document.getElementById('progress-bar-percent-text');
const progressBarNumberTextElement = document.getElementById('progress-bar-number-text');

const addDebtButton = document.getElementById('add-debt-button');
const removeDebtButton = document.getElementById('remove-debt-button');

const logContainer = document.getElementById('log-container');

const loadingScreen = document.getElementById('loading-screen');

const CACHE_EXPIRATION_TIME = 2 * 60 * 1000;
const initialDebt = 258;

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

    if (cachedDebt && cachedDebtTime && Date.now() - cachedDebtTime < CACHE_EXPIRATION_TIME) {
        const parsedDebt = JSON.parse(cachedDebt);
        updateSite(parsedDebt);
    }
    else {
        try {
            const response = await fetch('/.netlify/functions/fetch-debt');
            const data = await response.json();

            localStorage.setItem('debtData', JSON.stringify(data));
            localStorage.setItem('debtDataTime', Date.now().toString());

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

    progressBarElement.style.width = (percentComplete + '%').toString();
    progressBarPercentTextElement.textContent = ('I am ' + percentComplete + '% Free!').toString();
    progressBarNumberTextElement.textContent = (Math.abs(debtPayed) + '/' + (initialDebt + debtAdded) + ' Games Completed').toString();
}

function buildLog(data) {
    data.debt.forEach(entry => {
        const tableRow = document.createElement('tr');

        const amountData = document.createElement('td');
        const gameText = entry.amount !== 1 && entry.amount !== -1 ? 'Games' : 'Game';
        amountData.textContent = `${entry.amount > 0 ? '+' : ''}${entry.amount} ${gameText}`;
        tableRow.append(amountData);

        const descriptionData = document.createElement('td');
        descriptionData.textContent = entry.description;
        tableRow.append(descriptionData);

        const dateData = document.createElement('td');
        const date = new Date(entry.created_at);
        const options = { year: 'numeric', month: 'long', day: '2-digit' };
        const humanReadableDate = date.toLocaleDateString(undefined, options);

        dateData.textContent = humanReadableDate;
        tableRow.append(dateData);

        logContainer.append(tableRow);
    });
};

function buildChart(data) {
    const sorted = data.debt.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let gamesLeft = 0;
    let gamesPlayed = 0;

    const chartData = sorted.map(entry => {
        entry.amount > 0 ? gamesLeft += entry.amount : gamesPlayed += Math.abs(entry.amount);

        return {
            x: entry.created_at,
            y: (initialDebt + gamesLeft) - gamesPlayed,
            description: entry.description
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
                            return [line1, line2];
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