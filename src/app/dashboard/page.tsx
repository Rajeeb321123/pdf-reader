import Dashboard from '@/components/Dashboard';
import { db } from '@/db';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { redirect } from 'next/navigation';

const Page = async() => {
    const { getUser } = getKindeServerSession();
    const user = getUser();

    // ?origin=dashboard is imp because now we can navigate back to dashboard after authentication
    if(!user || !user.id) redirect('/auth-callback?origin=dashboard');

    const dbUser = await db.user.findFirst({
        where: {
            id: user.id
        }
    });

    if (!dbUser) redirect('/auth-callback?origin=dashboard');

    return (
        <Dashboard />
    )
}

export default Page;