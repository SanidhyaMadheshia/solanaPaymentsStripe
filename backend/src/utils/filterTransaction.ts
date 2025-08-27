export function filterTransaction(transactions: any[], senderAddress: string) {
  return transactions.filter(
    (tx) => tx.sender_address === senderAddress
  );
}
