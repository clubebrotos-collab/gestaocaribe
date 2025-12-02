
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

// Formata uma string numérica crua (ex: "1234") para moeda BRL (ex: "R$ 12,34")
// Se estiver vazia, retorna vazio.
export const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    const onlyDigits = value.replace(/\D/g, "");

    if (onlyDigits === "") {
        return "";
    }

    // Divide por 100 para considerar os centavos
    const amount = Number(onlyDigits) / 100;

    return amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
};

// Converte a string formatada (ex: "R$ 1.234,56") de volta para número float (1234.56)
export const parseCurrencyInput = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "");
    if (onlyDigits === "") return 0;
    return Number(onlyDigits) / 100;
};

export const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
};