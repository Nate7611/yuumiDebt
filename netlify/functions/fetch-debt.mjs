import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)


export default async (req, context) => {
    try {
        const { data: debt, error } = await supabase
            .from('debt')
            .select('*');

        if (error) {
            console.error('Error fetching debt:', error);
            return new Response(JSON.stringify({ message: 'Error fetching debt data', error }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ debt }), {
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