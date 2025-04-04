const progressBarElement = document.getElementById('progress-bar');
const progressBarTextElement = document.getElementById('progress-bar-text');

const CACHE_EXPIRATION_TIME = 2 * 60 * 1000;
const initialDebt = 258;

let debtAdded = 0;
let debtPayed = 0;

main();

function main() {
    fetchDebt();
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
    progressBarTextElement.textContent = (percentComplete + '% Complete').toString();
}
