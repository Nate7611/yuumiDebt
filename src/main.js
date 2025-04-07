import Chart from 'chart.js/auto';
import 'chartjs-adapter-luxon';

const PROGRESS_BAR = document.getElementById('progress-bar');
const PROGRESS_BAR_PERCENT_TEXT = document.getElementById('progress-bar-percent-text');
const PROGRESS_BAR_NUMBER_TEXT = document.getElementById('progress-bar-number-text');

const ADD_DEBT_BUTTON = document.getElementById('add-debt-button');
const REMOVE_DEBT_BUTTON = document.getElementById('remove-debt-button');

const LOG_CONTAINER = document.getElementById('log-container');

const LOADING_SCREEN = document.getElementById('loading-screen');

const FULL_LOG_BUTTON = document.getElementById('full-log-button');

const CACHE_EXPIRATION_TIME = 2 * 60 * 1000;
const INITIAL_DEBT = 258;
const DEBT_LOG_LENGTH = 15;

let displayFullLog = false;

window.addEventListener('DOMContentLoaded', () => {
    main();
});

function main() {
    fetchDebt();

    ADD_DEBT_BUTTON.addEventListener('click', addDebt);
    REMOVE_DEBT_BUTTON.addEventListener('click', removeDebt);
};

function updateSite(data) {
    calculateDebt(data);
    buildLog(data);
    buildChart(data);

    setTimeout(() => {
        LOADING_SCREEN.style.display = 'none';
    }, 100);
}

async function fetchDebt() {
    const cachedDebt = localStorage.getItem('debtData');
    const cachedDebtTime = localStorage.getItem('debtDataTime');

    if (cachedDebt && cachedDebtTime && Date.now() - cachedDebtTime < CACHE_EXPIRATION_TIME) {
        const parsedDebt = JSON.parse(cachedDebt);
        updateSite(parsedDebt);


        FULL_LOG_BUTTON.addEventListener('click', () => {
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

            FULL_LOG_BUTTON.addEventListener('click', () => {
                displayFullLog = !displayFullLog;
                buildLog(data);
            });

            updateSite(data);
        } catch (error) {
            console.error('Error fetching debt:', error);
            LOADING_SCREEN.textContent = 'Error loading content, please try again later.';
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

    const percentComplete = ((Math.abs(debtPayed) / (INITIAL_DEBT + debtAdded)) * 100).toFixed(1);

    PROGRESS_BAR.style.width = (percentComplete + '%').toString();
    PROGRESS_BAR_PERCENT_TEXT.textContent = ('I am ' + percentComplete + '% Free!').toString();
    PROGRESS_BAR_NUMBER_TEXT.textContent = (Math.abs(debtPayed) + '/' + (INITIAL_DEBT + debtAdded) + ' Games Completed').toString();
}

function buildLog(data) {
    LOG_CONTAINER.textContent = '';

    const RED_COLOR = '#eb4034';
    const GREEN_COLOR = '#34eb3a';

    const SORTED_DATA = [...data.debt].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (displayFullLog) {
        SORTED_DATA.forEach(entry => {
            const tableRow = document.createElement('tr');

            const amountData = document.createElement('td');
            const gameText = entry.amount !== 1 && entry.amount !== -1 ? 'Games' : 'Game';
            amountData.textContent = `${entry.amount > 0 ? '+' : ''}${entry.amount} ${gameText}`;
            entry.amount > 0 ? amountData.style.color = RED_COLOR : amountData.style.color = GREEN_COLOR;
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

            LOG_CONTAINER.append(tableRow);
        });
    }
    else {
        for (let index = 0; index < DEBT_LOG_LENGTH; index++) {
            const tableRow = document.createElement('tr');

            const amountData = document.createElement('td');
            const gameText = SORTED_DATA[index].amount !== 1 && SORTED_DATA[index].amount !== -1 ? 'Games' : 'Game';
            amountData.textContent = `${SORTED_DATA[index].amount > 0 ? '+' : ''}${SORTED_DATA[index].amount} ${gameText}`;
            SORTED_DATA[index].amount > 0 ? amountData.style.color = RED_COLOR : amountData.style.color = GREEN_COLOR;
            tableRow.append(amountData);

            const descriptionData = document.createElement('td');
            descriptionData.textContent = SORTED_DATA[index].description;
            tableRow.append(descriptionData);

            const dateData = document.createElement('td');
            const date = new Date(SORTED_DATA[index].created_at);
            const options = { year: 'numeric', month: 'long', day: '2-digit' };
            const humanReadableDate = date.toLocaleDateString(undefined, options);

            dateData.textContent = humanReadableDate;
            tableRow.append(dateData);

            LOG_CONTAINER.append(tableRow);
        }
    }
};

function buildChart(data) {
    const sorted = data.debt.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let gamesLeft = 0;
    let gamesPlayed = 0;

    const chartData = sorted.map(entry => {
        entry.amount > 0 ? gamesLeft += entry.amount : gamesPlayed += Math.abs(entry.amount);

        return {
            x: entry.created_at,
            y: (INITIAL_DEBT + gamesLeft) - gamesPlayed,
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