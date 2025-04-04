const progressBarElement = document.getElementById('progress-bar');
const progressBarPercentTextElement = document.getElementById('progress-bar-percent-text');
const progressBarNumberTextElement = document.getElementById('progress-bar-number-text');

const debtLogContainer = document.getElementById('log-container');

const addDebtButton = document.getElementById('add-debt-button');
const removeDebtButton = document.getElementById('remove-debt-button');

const CACHE_EXPIRATION_TIME = 5 * 60 * 1000;
const initialDebt = 258;

let debtAdded = 0;
let debtPayed = 0;

main();

function main() {
    fetchDebt();

    addDebtButton.addEventListener('click', addDebt);
    removeDebtButton.addEventListener('click', removeDebt);
};

async function fetchDebt() {
    const cachedDebt = localStorage.getItem('debtData');
    const cachedDebtTime = localStorage.getItem('debtDataTime');

    if (cachedDebt && cachedDebtTime && Date.now() - cachedDebtTime < CACHE_EXPIRATION_TIME) {
        const parsedDebt = JSON.parse(cachedDebt);
        calculateDebt(parsedDebt);
    } else {
        try {
            const response = await fetch('/.netlify/functions/fetch-debt');
            const data = await response.json();

            localStorage.setItem('debtData', JSON.stringify(data));
            localStorage.setItem('debtDataTime', Date.now().toString());

            calculateDebt(data);
        } catch (error) {
            console.error('Error fetching debt:', error);
        }
    }
}

function calculateDebt(debt) {
    console.log(debt);

    debt.debt.forEach(entry => {
        console.log(entry);

        if (entry.amount > 0) {
            debtAdded += entry.amount;
        }
        else {
            debtPayed += entry.amount;
        }
    });

    let percentComplete = ((Math.abs(debtPayed) / (initialDebt + debtAdded)) * 100).toFixed(1);
    console.log('Debt added: ', debtAdded);
    console.log('Debt payed: ', Math.abs(debtPayed));

    progressBarElement.style.width = (percentComplete + '%').toString();
    progressBarPercentTextElement.textContent = ('I am ' + percentComplete + '% Free!').toString();
    progressBarNumberTextElement.textContent = (Math.abs(debtPayed) + '/' + (initialDebt + debtAdded) + ' Games Completed').toString();
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
}