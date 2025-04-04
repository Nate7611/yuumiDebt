import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async (req, context) => {
    try {
        let userIp = req.headers.get('x-nf-client-connection-ip') || 'Unknown IP';

        const { data: existingEntries, error: fetchError } = await supabase
            .from('debt')
            .select('user_ip')
            .eq('user_ip', userIp);

        if (fetchError) {
            console.error('Error checking for existing vote:', fetchError);
            return new Response(JSON.stringify({ message: 'Error checking for existing vote', error: fetchError }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (existingEntries.length > 0) {
            return new Response(JSON.stringify({ message: 'You have already made a change to the debt!' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Insert new debt entry
        const { error: insertError } = await supabase
            .from('debt')
            .insert({ amount: 1, description: `Added by User`, user_ip: userIp });

        if (insertError) {
            console.error('Error inserting debt:', insertError);
            return new Response(JSON.stringify({ message: 'Error inserting debt data', error: insertError }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ message: 'Debt Added Successfully, Thanks a lot...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('Unexpected error:', err);
        return new Response(JSON.stringify({ message: 'Internal server error', error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};