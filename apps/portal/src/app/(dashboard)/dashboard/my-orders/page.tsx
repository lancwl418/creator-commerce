import MyOrders from './MyOrders';

export default function MyOrdersPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
        <p className="text-gray-500 text-sm mt-1">Your purchases from the ghostyle store</p>
      </div>
      <MyOrders />
    </div>
  );
}
