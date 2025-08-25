import { Link, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";

export default function AdminPage() {
    const isAuthenticated = useUserStore((s) => s.isAuthenticated);
    const user = useUserStore((s) => s.user);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mb-6">{user?.username ? `Signed in as ${user.username}` : null}</p>
            <div className="grid gap-4 sm:grid-cols-2">
                <AdminAction to="/admin/problem/new" title="Add Problem" desc="Create a new coding problem." />
                <AdminAction to="/admin/problem" title="Edit Problem" desc="Find & update an existing problem." />
                <AdminAction to="/admin/contest/new" title="Add Contest" desc="Set up a new contest." />
            <AdminAction to="/admin/contest/edit" title="Edit Contest" desc="Load & update an existing contest." />
                <AdminAction to="/admin/testcase/new" title="Add Testcase" desc="Attach testcases to a problem." />
            </div>
        </div>
    );
}

function AdminAction({ to, title, desc }) {
    return (
        <Link
            to={to}
            className="group border rounded-lg p-4 flex flex-col gap-2 hover:border-indigo-500 hover:shadow transition"
        >
            <span className="font-semibold text-lg group-hover:text-indigo-600">{title}</span>
            <span className="text-sm text-gray-500">{desc}</span>
        </Link>
    );
}