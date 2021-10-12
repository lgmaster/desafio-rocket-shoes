import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({ } as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId)
      const productResponse = await api.get(`/products/${productId}`);
      const stockResponse = await api.get(`/stock/${productId}`);
      const detailsOfProduct = productResponse.data;
      const checkStockOfProduct = stockResponse.data;

      if (productInCart) {
        const newAmount = productInCart.amount + 1;
        if (newAmount > checkStockOfProduct.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.filter(product => {
          if (productInCart.id === product.id) {
            product.amount = newAmount;
          }

          return product;
        })

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        const product = detailsOfProduct;
        product.amount = 1;

        if (product.amount > checkStockOfProduct.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        setCart([...cart, product]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, product]));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const checkProductInCart = cart.find(product => product.id === productId);

      if (!checkProductInCart) {
        throw new Error();
      }

      const newCart = cart.filter(product => product.id !== productId)

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get(`/stock/${productId}`);
      const checkStockOfProduct = stockResponse.data;

      if (amount > checkStockOfProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        throw new Error('Product out of stock')
      }

      const newCart = cart.filter(product => {
        if (product.id === productId) {
          product.amount = amount;
        }

        return product;
      });

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
