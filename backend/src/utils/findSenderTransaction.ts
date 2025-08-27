import axios from "axios";

export async function fetchTransaction(senderAddress: string){
    try{
        const url = `https://api.testnet.hiro.so/extended/v1/address/${senderAddress}/transactions`;
        const response = await axios.get(url);
        const txns = response.data.results;
        console.log(txns);
        return txns;
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
}