import { useState } from 'react';

const Checkout = () => {
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

  const handleShippingInfoChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handlePaymentInfoChange = (e) => {
    setPaymentInfo({
      ...paymentInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission and order placement
    console.log('Shipping Info:', shippingInfo);
    console.log('Payment Info:', paymentInfo);
  };

  return (
    <div>
      <h2>Checkout</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <h3>Shipping Information</h3>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={shippingInfo.name}
            onChange={handleShippingInfoChange}
          />
          <input
            type="text"
            name="address"
            placeholder="Address"
            value={shippingInfo.address}
            onChange={handleShippingInfoChange}
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            value={shippingInfo.city}
            onChange={handleShippingInfoChange}
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            value={shippingInfo.state}
            onChange={handleShippingInfoChange}
          />
          <input
            type="text"
            name="zip"
            placeholder="ZIP Code"
            value={shippingInfo.zip}
            onChange={handleShippingInfoChange}
          />
        </div>
        <div>
          <h3>Payment Information</h3>
          <input
            type="text"
            name="cardNumber"
            placeholder="Card Number"
            value={paymentInfo.cardNumber}
            onChange={handlePaymentInfoChange}
          />
          <input
            type="text"
            name="expiryDate"
            placeholder="Expiry Date"
            value={paymentInfo.expiryDate}
            onChange={handlePaymentInfoChange}
          />
          <input
            type="text"
            name="cvv"
            placeholder="CVV"
            value={paymentInfo.cvv}
            onChange={handlePaymentInfoChange}
          />
        </div>
        <button type="submit">Place Order</button>
      </form>
    </div>
  );
};

export default Checkout;