import { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import styles from './styles/ProductList.module.css';

const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('https://fakestoreapi.com/products');
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  });

  return (
    <div className={styles.productList}>
      <h2>Product List</h2>
      <div className={styles.productListCards}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductList;