import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart"); //null ou string,

    if (storagedCart) {
      return JSON.parse(storagedCart); //Para voltar ele de string para obj
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  }, [cart]);

  const cartPreviousValue = prevCartRef.current ?? cart; //nulish operator, se o argumento da esquedar foi falsy ou falso, ele atribui o valor da direita, se nao ele atribiu o da direita.

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; //updated cart vai ser um novo array de cart. sem alterar o array principal
      const productExists = updatedCart.find(
        (product) => product.id === productId
      ); //verificando se o produto existe, de acordo com a variavel passada dentro do addProduct
      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0; //verificacao se existe aquele produto dentro do carrinho.
      const amount = currentAmount + 1; //quantidade desejada pelo cliente

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return; //caso ele falhe, nao precisa continuar com a verificacao. retorna
      }
      if (productExists) {
        productExists.amount = amount; //caso ele existe e nao de erro ele segue para essa linha
      } else {
        const product = await api.get(`products/${productId}`);
        //O amount nao é retornado pela Api, no caso vamos adicionar caso ele nao exista.
        const newProduct = {
          ...product.data,
          amount: 1,
        };

        updatedCart.push(newProduct);
        //Esse push pode ser dado dentro do cart, porq ele nao esta dentro da mesma referencia.
        //Assim vc respeita o principio da imutabilidade
      }
      setCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; //manter a imutabilidades
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      ); //checando se o produto existe dentro do carrinho - se o findIndex nao encontrar ele retorna -1
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1); //splice ele muda o cart.
        setCart(updatedCart);
      } else {
        throw Error(); //ele para de rodar no try vai pro catch
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //se a quantidade desejada for maior ou igual a zero
      if (amount <= 0) {
        return;
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
