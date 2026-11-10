import styles from './styles.css?raw';
import { mountMenu } from './boot.jsx';

const mount = () => {
  mountMenu({ styles });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
