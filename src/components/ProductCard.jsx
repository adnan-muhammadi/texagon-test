import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './styles/ProductCard.module.css';

const ProductCard = ({ product }) => {
  return (
    <div className={styles.productCard}>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p className={styles.price}>Price: ${product.price}</p>
      <Link to={`/products/${product.id}`} className={styles.viewDetails}>
        View Details
      </Link>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    image: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    id: PropTypes.number.isRequired,
  }).isRequired,
};

export default ProductCard;