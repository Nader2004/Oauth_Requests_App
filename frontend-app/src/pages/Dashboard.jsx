import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
    const [requests, setRequests] = useState([]);
    const [user, setUser] = useState(null);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const token = new URLSearchParams(location.search).get('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }


        fetchUserData();
        fetchRequests();
    }, [token]);

    const fetchUserData = async () => {
        try {
            const response = await fetch('https://localhost:4000/auth/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const userData = await response.json();
            setUser(userData);
        } catch (error) {
            console.error('Failed to fetch user data', error);
            navigate('/login');
        }
    };

    const fetchRequests = async () => {
        try {
            const response = await fetch('https://localhost:4002/requests', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        }
    };

    const handleCreateRequest = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);

        try {
            const response = await fetch('https://localhost:4002/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    type: formData.get('type'),
                    urgency: formData.get('urgency'),
                    superior: {
                        email: formData.get('superiorEmail')
                    }
                })
            });
            console.log(response);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create request');
            }

            toast({
                title: 'Success',
                description: 'Request created successfully'
            });
            setOpen(false);
            fetchRequests();
        } catch (error) {
            console.error('Failed to create request', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to create request',
                variant: 'destructive'
            });
        }
    };

    const handleApprove = async (requestId) => {
        try {
            const response = await fetch(`https://localhost:4002/requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'approved' })
            });

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Request approved successfully'
                });
                fetchRequests();
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to approve request',
                variant: 'destructive'
            });
        }
    };

    const handleLogout = () => {
        // Send logout notification
        fetch('https://localhost:4001/notify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'logout',
                recipients: [user?.email], // Access user's email if defined
                subject: 'Successful Logout',
                content: 'You have successfully logged out from the application.'
            }),
        });

        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-red-900">Dashboard</h1>
                    <Button onClick={handleLogout} variant="outline">Logout</Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex justify-end mb-6">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Create New Request</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Request</DialogTitle>
                                <DialogDescription>
                                    Fill in the details for your new request
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateRequest} className="space-y-4">
                                <Input name="title" placeholder="Title" required />
                                <Textarea name="description" placeholder="Description" required />
                                <Select name="type" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Leave">Leave</SelectItem>
                                        <SelectItem value="Equipment">Equipment</SelectItem>
                                        <SelectItem value="Overtime">Overtime</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select name="urgency" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select urgency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input name="superiorEmail" type="email" placeholder="Superior's Email" required />
                                <Button type="submit" className="w-full">Submit Request</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-white shadow overflow-hidden rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((request) => (
                                <tr key={request._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                                        <div className="text-sm text-gray-500">{request.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {request.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.urgency === 'High' ? 'bg-red-100 text-red-800' :
                                            request.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                            {request.urgency}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {request.superior?.email === user?.email && request.status === 'pending' && (
                                            <div className="space-x-2">
                                                <Button
                                                    onClick={() => handleApprove(request._id)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    onClick={() => handleReject(request._id)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;