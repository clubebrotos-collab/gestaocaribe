
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
};
