import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Check, Pencil, Calendar, Lock } from 'lucide-react-native';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { orderService, db } from '../../services';
import { getProductImageSource } from '../../utils/productImage';
import { truncateProductName } from '../../utils/productName';

const DEFAULT_PRODUCT_IMAGE = require('../../../assets/agua-sanitaria.png');

const MOBILE_BREAKPOINT = 768;

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isValidCEP(cep: string): boolean {
  return /^\d{5}-?\d{3}$/.test(cep.replace(/\D/g, ''));
}

const DELIVERY_FEE = 10.90;

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

type PaymentMethod = 'entrega' | 'crediffato' | 'credito' | 'convenio' | 'pix' | 'google';

interface Props {
  route: any;
  navigation: any;
}

export const CheckoutDataScreen: React.FC<Props> = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  const emailParam = route.params?.email ?? '';
  const { items, getTotalAmount, clearCart, selectedMarketId } = useCart();
  const { user } = useAuth();

  const [email, setEmail] = useState(emailParam);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState({ 
    firstName: false, 
    lastName: false, 
    email: false, 
    cpf: false, 
    phone: false 
  });
  const [step1Complete, setStep1Complete] = useState(false);

  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({ street: '', neighborhood: '', city: '', state: '' });
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [touchedEntrega, setTouchedEntrega] = useState({ 
    cep: false,
    numero: false, 
    destinatario: false 
  });
  const [deliveryType, setDeliveryType] = useState<'retirada' | 'entrega'>('entrega');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [step2Complete, setStep2Complete] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('entrega');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [touchedPayment, setTouchedPayment] = useState({
    cardNumber: false,
    cardName: false,
    cardExpMonth: false,
    cardExpYear: false,
    cardCvv: false,
    cardCpf: false,
  });
  const [billingAddressSame, setBillingAddressSame] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartTotal = getTotalAmount();
  const discounts = Math.max(0, subtotal - cartTotal);
  const deliveryFee = deliveryType === 'entrega' && step1Complete ? DELIVERY_FEE : 0;
  const total = cartTotal + deliveryFee;

  // Preencher automaticamente os dados do usuário logado
  useEffect(() => {
    if (user) {
      // Dados pessoais
      const nameParts = user.name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email);
      if (user.cpf) setCpf(user.cpf);
      if (user.phone) setPhone(user.phone);

      // Endereço
      if (user.address) {
        setCep(user.address.cep);
        setAddress({
          street: user.address.street,
          neighborhood: user.address.neighborhood,
          city: user.address.city,
          state: user.address.state,
        });
        setNumero(user.address.number);
        if (user.address.complement) setComplemento(user.address.complement);
        setDestinatario(user.name);

        // Auto-preencher data de entrega
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setScheduleDate(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        setScheduleTime('15:00-18:00');
      }

      // Cartão de pagamento
      if (user.paymentCard) {
        setPaymentMethod('credito');
        setCardNumber(user.paymentCard.number);
        setCardName(user.paymentCard.name);
        setCardExpMonth(user.paymentCard.expMonth);
        setCardExpYear(user.paymentCard.expYear);
        setCardCpf(user.paymentCard.cpf);
      }
    }
  }, [user]);

  // Auto-avançar etapa 1 se dados pessoais estiverem preenchidos
  useEffect(() => {
    if (firstName.trim() && lastName.trim() && isValidEmail(email) && !step1Complete) {
      setStep1Complete(true);
    }
  }, [firstName, lastName, email, step1Complete]);

  // Auto-avançar etapa 2 se dados de entrega estiverem preenchidos
  useEffect(() => {
    if (step1Complete && isValidCEP(cep) && numero.trim() && destinatario.trim() && address.street && !step2Complete) {
      setStep2Complete(true);
    }
  }, [step1Complete, cep, numero, destinatario, address.street, step2Complete]);

  const handleCpfChange = (text: string) => setCpf(maskCPF(text));
  const handlePhoneChange = (text: string) => setPhone(maskPhone(text));

  // Funções de validação
  const isValidCPF = (cpfValue: string): boolean => {
    const digits = cpfValue.replace(/\D/g, '');
    return digits.length === 11;
  };

  const isValidPhone = (phoneValue: string): boolean => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  };

  const isValidCardNumber = (cardNumberValue: string): boolean => {
    const digits = cardNumberValue.replace(/\D/g, '');
    return digits.length >= 13 && digits.length <= 16;
  };

  const isValidExpiry = (month: string, year: string): boolean => {
    if (!month || !year) return false;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (monthNum < 1 || monthNum > 12) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    if (yearNum < currentYear) return false;
    if (yearNum === currentYear && monthNum < currentMonth) return false;
    return true;
  };

  const isValidCVV = (cvvValue: string): boolean => {
    const digits = cvvValue.replace(/\D/g, '');
    return digits.length === 3 || digits.length === 4;
  };

  // Validações de erro para exibir
  const nameError = touched.firstName && !firstName.trim() ? 'Campo obrigatório' : null;
  const lastNameError = touched.lastName && !lastName.trim() ? 'Campo obrigatório' : null;
  const emailError = touched.email && !isValidEmail(email) ? 'E-mail inválido' : null;
  const cpfError = touched.cpf && cpf && !isValidCPF(cpf) ? 'CPF inválido' : null;
  const phoneError = touched.phone && phone && !isValidPhone(phone) ? 'Telefone inválido' : null;

  const cepError = touchedEntrega.cep && !isValidCEP(cep) ? 'CEP inválido' : null;
  const numeroError = touchedEntrega.numero && !numero.trim() ? 'Campo obrigatório' : null;
  const destinatarioError = touchedEntrega.destinatario && !destinatario.trim() ? 'Campo obrigatório' : null;

  const needsCardValidation = paymentMethod === 'credito' || paymentMethod === 'crediffato' || paymentMethod === 'convenio';
  const cardNumberError = needsCardValidation && touchedPayment.cardNumber && !isValidCardNumber(cardNumber) 
    ? 'Número de cartão inválido' : null;
  const cardNameError = needsCardValidation && touchedPayment.cardName && !cardName.trim() 
    ? 'Nome do titular obrigatório' : null;
  const cardExpiryError = needsCardValidation && (touchedPayment.cardExpMonth || touchedPayment.cardExpYear) 
    && !isValidExpiry(cardExpMonth, cardExpYear) 
    ? 'Data de validade inválida' : null;
  const cardCvvError = needsCardValidation && touchedPayment.cardCvv && !isValidCVV(cardCvv) 
    ? 'CVV inválido' : null;
  const cardCpfError = needsCardValidation && touchedPayment.cardCpf && !isValidCPF(cardCpf) 
    ? 'CPF inválido' : null;

  const handleIrParaEntrega = () => {
    setTouched({ 
      firstName: true, 
      lastName: true, 
      email: true, 
      cpf: false, 
      phone: false 
    });
    
    if (!firstName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o primeiro nome');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o último nome');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido');
      return;
    }
    
    setDestinatario((prev) => prev || `${firstName.trim()} ${lastName.trim()}`.trim());
    setStep1Complete(true);
  };

  const handleCepChange = (text: string) => {
    setCep(maskCEP(text));
    if (text.replace(/\D/g, '').length === 8) {
      setAddress({ street: 'Rua Pedro Eloy de Souza', neighborhood: 'Bairro Alto', city: 'Curitiba', state: 'PR' });
      if (!scheduleDate) {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setScheduleDate(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        if (!scheduleTime) setScheduleTime('15:00-18:00');
      }
    }
  };

  const handleIrParaPagamento = () => {
    setTouchedEntrega({ cep: true, numero: true, destinatario: true });
    
    if (!isValidCEP(cep)) {
      Alert.alert('Erro', 'Por favor, insira um CEP válido');
      return;
    }
    if (!numero.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o número do endereço');
      return;
    }
    if (!destinatario.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do destinatário');
      return;
    }
    if (!address.street) {
      Alert.alert('Erro', 'Por favor, aguarde o carregamento do endereço');
      return;
    }
    
    setStep2Complete(true);
  };

  const handleVoltarCarrinho = () => navigation.goBack();

  const handleCardNumberChange = (text: string) => setCardNumber(maskCardNumber(text));
  const handleCardCpfChange = (text: string) => setCardCpf(maskCPF(text));

  const handleFinalizarCompra = async () => {
    // Validar campos de pagamento se necessário
    if (paymentMethod === 'credito' || paymentMethod === 'crediffato' || paymentMethod === 'convenio') {
      setTouchedPayment({
        cardNumber: true,
        cardName: true,
        cardExpMonth: true,
        cardExpYear: true,
        cardCvv: true,
        cardCpf: true,
      });

      if (!isValidCardNumber(cardNumber)) {
        Alert.alert('Erro', 'Por favor, insira um número de cartão válido');
        return;
      }
      if (!cardName.trim()) {
        Alert.alert('Erro', 'Por favor, preencha o nome do titular do cartão');
        return;
      }
      if (!isValidExpiry(cardExpMonth, cardExpYear)) {
        Alert.alert('Erro', 'Por favor, insira uma data de validade válida');
        return;
      }
      if (!isValidCVV(cardCvv)) {
        Alert.alert('Erro', 'Por favor, insira um CVV válido (3 ou 4 dígitos)');
        return;
      }
      if (!isValidCPF(cardCpf)) {
        Alert.alert('Erro', 'Por favor, insira um CPF válido');
        return;
      }
    }
    
    if (!selectedMarketId || items.length === 0) {
      Alert.alert('Erro', 'Carrinho vazio ou mercado não selecionado.');
      return;
    }
    
    // Permite compra como guest ou usuário logado
    const customerId = user?.id ?? `guest_${email.replace('@', '_').replace('.', '_')}`;
    
    setFinalizing(true);
    try {
      const order = await orderService.createOrder({
        customerId,
        marketId: selectedMarketId,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      clearCart();
      const estimatedTime = deliveryType === 'entrega' && scheduleTime ? scheduleTime : '20:00-22:00';
      
      // Buscar informações do mercado para redirecionar para a página inicial correta
      const market = selectedMarketId ? db.getMarketById(selectedMarketId) : db.getMarkets()[0];
      
      navigation.reset({
        index: 1,
        routes: [
          { 
            name: 'Products',
            params: { 
              marketId: market?.id || selectedMarketId, 
              marketName: market?.name || 'Mercado' 
            }
          },
          {
            name: 'OrderStatus',
            params: {
              orderId: order.id,
              deliveryStreet: address.street,
              deliveryNumber: numero,
              neighborhood: address.neighborhood,
              cep: cep || '82820-139',
              complemento,
              destinatario,
              paymentMethod,
              estimatedTime,
              totalAmount: total,
            },
          },
        ],
      });
    } catch (error: any) {
      Alert.alert('Erro', error.message ?? 'Erro ao finalizar pedido.');
    } finally {
      setFinalizing(false);
    }
  };

  const renderOrderSummary = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>RESUMO DO PEDIDO</Text>
      </View>
      <ScrollView style={styles.summaryList} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <View key={item.product.id} style={styles.summaryItem}>
            <View style={styles.summaryItemImageWrap}>
              <Image
                source={getProductImageSource(item.product.images?.[0], DEFAULT_PRODUCT_IMAGE)}
                style={styles.summaryItemImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.summaryItemInfo}>
              <Text style={styles.summaryItemName} numberOfLines={2}>{truncateProductName(item.product.name)}</Text>
              <View style={styles.summaryItemQtyRow}>
                <Text style={styles.summaryItemQty}>Qtd: {item.quantity}</Text>
                <Text style={styles.summaryItemPrice}>
                  R$ {(item.product.finalPrice * item.quantity).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={handleVoltarCarrinho} style={styles.voltarCarrinhoLink}>
        <ArrowLeft size={16} color="#2E7D32" />
        <Text style={styles.voltarCarrinhoText}>Voltar para o carrinho</Text>
      </TouchableOpacity>
      {step2Complete && (
        <TouchableOpacity style={styles.addObservationLink}>
          <Text style={styles.addObservationText}>Adicionar observação</Text>
        </TouchableOpacity>
      )}
      <View style={styles.summaryTotals}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>R$ {subtotal.toFixed(2).replace('.', ',')}</Text>
        </View>
        {discounts > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Descontos</Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              R$ -{discounts.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}
        {deliveryFee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor de entrega</Text>
            <Text style={styles.summaryValue}>R$ {deliveryFee.toFixed(2).replace('.', ',')}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>R$ {total.toFixed(2).replace('.', ',')}</Text>
        </View>
      </View>
      {step2Complete && (
        <TouchableOpacity
          style={[styles.finalizeButton, finalizing && styles.finalizeButtonDisabled]}
          onPress={handleFinalizarCompra}
          disabled={finalizing}
        >
          {finalizing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Lock size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.finalizeButtonText}>FINALIZAR COMPRA</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepTitleRow}>
        <Text style={styles.stepTitle}>1. DADOS PESSOAIS</Text>
        {step1Complete && <TouchableOpacity><Pencil size={18} color="#999" /></TouchableOpacity>}
      </View>
      <Text style={styles.stepSubtitle}>Solicitamos apenas as informações essenciais para a realização da compra.</Text>

      <View style={styles.fieldRow}>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>E-mail *</Text>
          <View style={styles.emailInputRow}>
            <TextInput
              style={[styles.input, styles.emailInput, emailError && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            />
            {isValidEmail(email) && (
              <Check size={20} color="#2E7D32" style={styles.checkIcon} />
            )}
          </View>
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.fieldWrap, styles.fieldHalf]}>
          <Text style={styles.fieldLabel}>Primeiro nome *</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Primeiro nome"
            placeholderTextColor="#999"
            onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
          />
        </View>
        <View style={[styles.fieldWrap, styles.fieldHalf]}>
          <Text style={styles.fieldLabel}>Último nome *</Text>
          <TextInput
            style={[styles.input, lastNameError && styles.inputError]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Último nome"
            placeholderTextColor="#999"
            onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
          />
        </View>
      </View>
      {(nameError || lastNameError) && (
        <Text style={styles.errorText}>{nameError || lastNameError}</Text>
      )}

      <View style={styles.fieldRow}>
        <View style={[styles.fieldWrap, styles.fieldHalf]}>
          <Text style={styles.fieldLabel}>CPF</Text>
          <TextInput
            style={[styles.input, cpfError && styles.inputError]}
            value={cpf}
            onChangeText={handleCpfChange}
            placeholder="999.999.999-99"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={14}
            onBlur={() => setTouched((t) => ({ ...t, cpf: true }))}
          />
          {cpfError && <Text style={styles.errorText}>{cpfError}</Text>}
        </View>
        <View style={[styles.fieldWrap, styles.fieldHalf]}>
          <Text style={styles.fieldLabel}>Telefone</Text>
          <TextInput
            style={[styles.input, phoneError && styles.inputError]}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="11 99999-9999"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={14}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          />
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
        </View>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleIrParaEntrega}
      >
        <Text style={styles.continueButtonText}>IR PARA A ENTREGA</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={[styles.stepContainer, !step1Complete && styles.stepInactive]}>
      <View style={styles.stepTitleRow}>
        <Text style={styles.stepTitle}>2. ENTREGA</Text>
        {step2Complete && <TouchableOpacity><Pencil size={18} color="#999" /></TouchableOpacity>}
      </View>
      {!step1Complete ? (
        <Text style={styles.stepAwaiting}>Aguardando o preenchimento dos dados</Text>
      ) : (
        <>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldWrap, styles.fieldFull]}>
              <Text style={styles.fieldLabel}>CEP *</Text>
              <View style={styles.cepRow}>
                <View style={[styles.emailInputRow, styles.cepInputWrap]}>
                  <TextInput
                    style={[styles.input, styles.emailInput, cepError && styles.inputError]}
                    value={cep}
                    onChangeText={handleCepChange}
                    placeholder="00000-000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={9}
                    onBlur={() => setTouchedEntrega((t) => ({ ...t, cep: true }))}
                  />
                  {isValidCEP(cep) && <Check size={20} color="#2E7D32" style={styles.checkIcon} />}
                </View>
                <TouchableOpacity><Text style={styles.linkText}>Não sei meu CEP</Text></TouchableOpacity>
              </View>
              {cepError && <Text style={styles.errorText}>{cepError}</Text>}
            </View>
          </View>
          {address.street && (
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{address.street} - alterar</Text>
              <Text style={styles.addressText}>{address.neighborhood} - {address.city} - {address.state}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldWrap, styles.fieldHalf]}>
              <Text style={styles.fieldLabel}>Número *</Text>
              <TextInput
                style={[styles.input, numeroError && styles.inputError]}
                value={numero}
                onChangeText={setNumero}
                placeholder="Número"
                placeholderTextColor="#999"
                keyboardType="numeric"
                onBlur={() => setTouchedEntrega((t) => ({ ...t, numero: true }))}
              />
              {numeroError && <Text style={styles.errorText}>{numeroError}</Text>}
            </View>
            <View style={[styles.fieldWrap, styles.fieldHalf]}>
              <Text style={styles.fieldLabel}>Complemento e referência</Text>
              <TextInput
                style={styles.input}
                value={complemento}
                onChangeText={setComplemento}
                placeholder="Opcional"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Destinatário *</Text>
              <View style={styles.emailInputRow}>
                <TextInput
                  style={[styles.input, styles.emailInput, destinatarioError && styles.inputError]}
                  value={destinatario}
                  onChangeText={setDestinatario}
                  placeholder="Nome do destinatário"
                  placeholderTextColor="#999"
                  onBlur={() => setTouchedEntrega((t) => ({ ...t, destinatario: true }))}
                />
                {destinatario.trim() && <Check size={20} color="#2E7D32" style={styles.checkIcon} />}
              </View>
              {destinatarioError && <Text style={styles.errorText}>{destinatarioError}</Text>}
            </View>
          </View>
          <Text style={styles.radioGroupLabel}>Escolha o tipo de entrega</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioOption, deliveryType === 'retirada' && styles.radioOptionSelected]}
              onPress={() => setDeliveryType('retirada')}
            >
              <View style={[styles.radioDot, deliveryType === 'retirada' && styles.radioDotSelected]}>
                {deliveryType === 'retirada' && <Check size={14} color="#fff" />}
              </View>
              <Text style={styles.radioText}>Retirada na loja: Av. Victor Ferreira do Amaral, nº 1088, Bairro Tarumã - Grátis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, deliveryType === 'entrega' && styles.radioOptionSelected]}
              onPress={() => setDeliveryType('entrega')}
            >
              <View style={[styles.radioDot, deliveryType === 'entrega' && styles.radioDotSelected]}>
                {deliveryType === 'entrega' && <Check size={14} color="#fff" />}
              </View>
              <Text style={styles.radioText}>Entrega - R$ {DELIVERY_FEE.toFixed(2).replace('.', ',')}</Text>
            </TouchableOpacity>
          </View>
          {scheduleDate && (
            <View style={styles.scheduleRow}>
              <Calendar size={20} color="#666" style={{ marginRight: 8 }} />
              <Text style={styles.scheduleText}>{scheduleDate}</Text>
            </View>
          )}
          {deliveryType === 'entrega' && (
            <>
              <Text style={styles.radioGroupLabel}>Hora do Agendamento</Text>
              <View style={styles.radioGroup}>
                {[
                  { id: '11-14', label: 'De 11:00 a 14:00', value: '11:00-14:00' },
                  { id: '15-18', label: 'De 15:00 a 18:00', value: '15:00-18:00' },
                  { id: '19-21', label: 'De 19:00 a 21:00', value: '19:00-21:00' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.radioOption, scheduleTime === opt.value && styles.radioOptionSelected]}
                    onPress={() => setScheduleTime(opt.value)}
                  >
                    <View style={[styles.radioDot, scheduleTime === opt.value && styles.radioDotSelected]}>
                      {scheduleTime === opt.value && <Check size={14} color="#fff" />}
                    </View>
                    <Text style={styles.radioText}>{opt.label} - R$ {DELIVERY_FEE.toFixed(2).replace('.', ',')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleIrParaPagamento}
          >
            <Text style={styles.continueButtonText}>IR PARA O PAGAMENTO</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderStep3 = () => {
    const showCardForm = paymentMethod === 'credito' || paymentMethod === 'crediffato' || paymentMethod === 'convenio';

    return (
      <View style={[styles.stepContainer, !step2Complete && styles.stepInactive]}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>3. PAGAMENTO</Text>
          {step2Complete && <TouchableOpacity><Pencil size={18} color="#999" /></TouchableOpacity>}
        </View>
        {!step2Complete ? (
          <Text style={styles.stepAwaiting}>Aguardando o preenchimento dos dados</Text>
        ) : (
          <View style={styles.paymentLayout}>
            <View style={styles.paymentMethodsColumn}>
              <TouchableOpacity style={styles.giftCardLink}>
                <Text style={styles.giftCardText}>Adicionar vale-presente</Text>
              </TouchableOpacity>
              {(
                [
                  { id: 'entrega' as PaymentMethod, label: 'PAGAMENTO NA ENTREGA / PAGAMENTO NA LOJA' },
                  { id: 'crediffato' as PaymentMethod, label: 'CARTÃO CREDIFFATO' },
                  { id: 'credito' as PaymentMethod, label: 'CARTÃO DE CRÉDITO' },
                  { id: 'convenio' as PaymentMethod, label: 'CARTÃO CONVÊNIO CREDIFFATO' },
                  { id: 'pix' as PaymentMethod, label: 'PIX' },
                  { id: 'google' as PaymentMethod, label: 'GOOGLE PAY' },
                ] as const
              ).map((opt) => {
                const iconBg = opt.id === 'crediffato' ? '#c62828' : opt.id === 'credito' ? '#333' : opt.id === 'pix' ? '#2E7D32' : '#ddd';
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.paymentMethodItem, paymentMethod === opt.id && styles.paymentMethodItemSelected]}
                    onPress={() => setPaymentMethod(opt.id)}
                  >
                    <View style={[styles.paymentMethodIcon, { backgroundColor: iconBg }]} />
                    <Text style={[styles.paymentMethodLabel, paymentMethod === opt.id && styles.paymentMethodLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {showCardForm && (
              <View style={styles.cardFormColumn}>
                <View style={styles.promoBanner}>
                  <Text style={styles.promoBannerTitle}>FRETE GRÁTIS acima de R$ 50 com Crediffato ou Mupay!</Text>
                  <Text style={styles.promoBannerDisclaimer}>*Não válido para pagamento na entrega</Text>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldWrap, styles.fieldFull]}>
                    <Text style={styles.fieldLabel}>Número do cartão *</Text>
                    <View style={styles.cardNumberRow}>
                      <TextInput
                        style={[styles.input, styles.cardNumberInput, cardNumberError && styles.inputError]}
                        value={cardNumber}
                        onChangeText={handleCardNumberChange}
                        placeholder="0000 0000 0000 0000"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={19}
                        onBlur={() => setTouchedPayment((t) => ({ ...t, cardNumber: true }))}
                      />
                      <View style={styles.ambienteSeguro}>
                        <Lock size={14} color="#666" />
                        <Text style={styles.ambienteSeguroText}>Ambiente Seguro</Text>
                      </View>
                    </View>
                    {cardNumberError && <Text style={styles.errorText}>{cardNumberError}</Text>}
                  </View>
                </View>
                <View style={styles.cardLogosRow}>
                  {['VISA', 'MC', 'Elo'].map((name) => (
                    <View key={name} style={styles.cardLogoBox}>
                      <Text style={styles.cardLogoText}>{name}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldWrap, styles.fieldFull]}>
                    <Text style={styles.fieldLabel}>Pagamento</Text>
                    <View style={styles.paymentDropdown}>
                      <Text style={styles.paymentDropdownText}>Pagamento à vista - R$ {total.toFixed(2).replace('.', ',')}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldWrap, styles.fieldFull]}>
                    <Text style={styles.fieldLabel}>Nome impresso no cartão *</Text>
                    <TextInput
                      style={[styles.input, cardNameError && styles.inputError]}
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="Nome como está no cartão"
                      placeholderTextColor="#999"
                      autoCapitalize="words"
                      onBlur={() => setTouchedPayment((t) => ({ ...t, cardName: true }))}
                    />
                    {cardNameError && <Text style={styles.errorText}>{cardNameError}</Text>}
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldWrap, styles.fieldHalf]}>
                    <Text style={styles.fieldLabel}>Validade *</Text>
                    <View style={styles.expiryRow}>
                      <TextInput
                        style={[styles.input, styles.expiryInput, cardExpiryError && styles.inputError]}
                        value={cardExpMonth}
                        onChangeText={(t) => setCardExpMonth(t.replace(/\D/g, '').slice(0, 2))}
                        placeholder="Mês"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                        onBlur={() => setTouchedPayment((t) => ({ ...t, cardExpMonth: true }))}
                      />
                      <Text style={styles.expirySeparator}>/</Text>
                      <TextInput
                        style={[styles.input, styles.expiryInput, cardExpiryError && styles.inputError]}
                        value={cardExpYear}
                        onChangeText={(t) => setCardExpYear(t.replace(/\D/g, '').slice(0, 2))}
                        placeholder="Ano"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                        onBlur={() => setTouchedPayment((t) => ({ ...t, cardExpYear: true }))}
                      />
                    </View>
                    {cardExpiryError && <Text style={styles.errorText}>{cardExpiryError}</Text>}
                  </View>
                  <View style={[styles.fieldWrap, styles.fieldHalf]}>
                    <Text style={styles.fieldLabel}>Código de segurança *</Text>
                    <TextInput
                      style={[styles.input, cardCvvError && styles.inputError]}
                      value={cardCvv}
                      onChangeText={(t) => setCardCvv(t.replace(/\D/g, '').slice(0, 4))}
                      placeholder="CVV"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                      onBlur={() => setTouchedPayment((t) => ({ ...t, cardCvv: true }))}
                    />
                    {cardCvvError && <Text style={styles.errorText}>{cardCvvError}</Text>}
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldWrap, styles.fieldFull]}>
                    <Text style={styles.fieldLabel}>CPF do titular *</Text>
                    <TextInput
                      style={[styles.input, cardCpfError && styles.inputError]}
                      value={cardCpf}
                      onChangeText={handleCardCpfChange}
                      placeholder="999.999.999-99"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={14}
                      onBlur={() => setTouchedPayment((t) => ({ ...t, cardCpf: true }))}
                    />
                    {cardCpfError && <Text style={styles.errorText}>{cardCpfError}</Text>}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.billingCheckbox}
                  onPress={() => setBillingAddressSame(!billingAddressSame)}
                >
                  <View style={[styles.checkbox, billingAddressSame && styles.checkboxChecked]}>
                    {billingAddressSame && <Check size={14} color="#fff" />}
                  </View>
                  <Text style={styles.billingCheckboxLabel}>
                    O endereço da fatura do cartão é {address.street || 'Rua Pedro Eloy de Souza'}, nº {numero || '...'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.twoCardsLink}>
                  <Text style={styles.twoCardsText}>Pagar usando dois cartões</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const leftColumnContent = (
    <ScrollView style={styles.stepsScroll} contentContainerStyle={styles.stepsContent} showsVerticalScrollIndicator={false}>
      {renderStep1()}
    </ScrollView>
  );

  const centerColumnContent = (
    <ScrollView style={styles.stepsScroll} contentContainerStyle={styles.stepsContent} showsVerticalScrollIndicator={false}>
      {renderStep2()}
      {renderStep3()}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <ArrowLeft size={22} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informar dados pessoais</Text>
      </View>

      <View style={[styles.body, isMobile && styles.bodyMobile]}>
        {isMobile ? (
          <>
            <ScrollView style={styles.mobileScroll} contentContainerStyle={styles.mobileScrollContent} showsVerticalScrollIndicator={false}>
              {renderStep1()}
              {renderStep2()}
              {renderStep3()}
            </ScrollView>
            <View style={styles.mobileSummary}>
              {renderOrderSummary()}
            </View>
          </>
        ) : (
          <>
            <View style={styles.leftColumn}>
              {leftColumnContent}
            </View>
            <View style={styles.centerColumn}>
              {centerColumnContent}
            </View>
            <View style={styles.rightColumn}>
              {renderOrderSummary()}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  bodyMobile: {
    flexDirection: 'column',
  },
  leftColumn: {
    width: 360,
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRightWidth: 1,
    borderRightColor: '#e8e8e8',
  },
  centerColumn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    minWidth: 0,
  },
  rightColumn: {
    width: 360,
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderLeftWidth: 1,
    borderLeftColor: '#e8e8e8',
  },
  mobileScroll: {
    flex: 1,
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  stepsScroll: {
    flex: 1,
  },
  stepsContent: {
    paddingBottom: 32,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  stepInactive: {
    opacity: 0.7,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pencilIcon: {
    marginLeft: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  stepAwaiting: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fieldWrap: {
    position: 'relative',
    flex: 1,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  fieldFull: {
    flex: 1,
    minWidth: 0,
  },
  cepInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  errorText: {
    fontSize: 13,
    color: '#d32f2f',
    marginTop: -8,
    marginBottom: 8,
  },
  emailInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  emailInput: {
    paddingRight: 44,
  },
  checkIcon: {
    position: 'absolute',
    right: 14,
  },
  cepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
  },
  addressBox: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  radioGroupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
    marginTop: 8,
  },
  radioGroup: {
    gap: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  radioOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  radioDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDotSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  radioText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: '#555',
    textTransform: 'capitalize',
  },
  continueButton: {
    backgroundColor: '#D84315',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  summaryHeader: {
    backgroundColor: '#4a4a4a',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  summaryList: {
    maxHeight: 220,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryItemImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  summaryItemImage: {
    width: '100%',
    height: '100%',
  },
  summaryItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  summaryItemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  summaryItemQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItemQty: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  summaryItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  voltarCarrinhoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  voltarCarrinhoText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  summaryTotals: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  discountValue: {
    color: '#2E7D32',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  mobileSummary: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addObservationLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addObservationText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  finalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D84315',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  finalizeButtonDisabled: {
    opacity: 0.8,
  },
  paymentLayout: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  paymentMethodsColumn: {
    minWidth: 260,
    flex: 0,
  },
  giftCardLink: {
    marginBottom: 16,
  },
  giftCardText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  paymentMethodItemSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  paymentMethodIcon: {
    width: 36,
    height: 24,
    marginRight: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethodLabelSelected: {
    color: '#1976d2',
  },
  cardLogoPlaceholder: {
    width: 24,
    height: 18,
    borderRadius: 2,
  },
  cardFormColumn: {
    flex: 1,
    minWidth: 280,
  },
  promoBanner: {
    backgroundColor: '#E91E63',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  promoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  promoBannerDisclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardNumberInput: {
    flex: 1,
    minWidth: 0,
  },
  ambienteSeguro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  ambienteSeguroText: {
    fontSize: 12,
    color: '#666',
  },
  cardLogosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  cardLogoBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardLogoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  paymentDropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  paymentDropdownText: {
    fontSize: 15,
    color: '#333',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiryInput: {
    flex: 1,
    minWidth: 0,
  },
  expirySeparator: {
    fontSize: 18,
    color: '#999',
  },
  billingCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  billingCheckboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  twoCardsLink: {
    marginBottom: 8,
  },
  twoCardsText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
});
