import type { OrderDetailData } from '@/lib/types/order';
import { EditSection } from './EditSection';

interface OrderCustomerProps { order: OrderDetailData; shipping: OrderDetailData['shipping_address']; }

export default function OrderCustomer({ order, shipping }: OrderCustomerProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Customer</h3>
        <EditSection orderId={order.id} section="customer" fields={[
          { key: 'customer_name', label: 'Name', value: order.customer_name || '' },
          { key: 'customer_email', label: 'Email', value: order.customer_email || '' },
        ]} />
      </div>
      <div className="space-y-2 text-sm">
        {order.customer_name && (
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="text-gray-900 font-medium">{order.customer_name}</span>
          </div>
        )}
        {order.customer_email && (
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900">{order.customer_email}</span>
          </div>
        )}
      </div>
      {shipping && (shipping.address1 || shipping.city) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Shipping Address</p>
            <EditSection orderId={order.id} section="shipping" fields={[
              { key: 'name', label: 'Name', value: shipping.name || '' },
              { key: 'address1', label: 'Address 1', value: shipping.address1 || '' },
              { key: 'address2', label: 'Address 2', value: shipping.address2 || '' },
              { key: 'city', label: 'City', value: shipping.city || '' },
              { key: 'province', label: 'Province/State', value: shipping.province || '' },
              { key: 'zip', label: 'ZIP', value: shipping.zip || '' },
              { key: 'country', label: 'Country', value: shipping.country || '' },
              { key: 'phone', label: 'Phone', value: shipping.phone || '' },
            ]} />
          </div>
          <div className="text-sm text-gray-700 space-y-0.5">
            {shipping.name && <p className="font-medium text-gray-900">{shipping.name}</p>}
            {shipping.address1 && <p>{shipping.address1}</p>}
            {shipping.address2 && <p>{shipping.address2}</p>}
            <p>
              {[shipping.city, shipping.province, shipping.zip].filter(Boolean).join(', ')}
            </p>
            {shipping.country && <p>{shipping.country}</p>}
            {shipping.phone && (
              <p className="text-gray-500 mt-1">{shipping.phone}</p>
            )}
          </div>
        </div>
      )}
    </div>


  );
}
