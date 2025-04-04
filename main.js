async function fetchDebt() {
    try {
        const response = await fetch('/.netlify/functions/fetch-debt');

        if (!response.ok) {
            console.error('Error fetching debt data');
            return;
        }

        const data = await response.json();
        console.log('Debt Data:', data.debt);
    } catch (error) {
        console.error('Error:', error);
    }
}

fetchDebt();