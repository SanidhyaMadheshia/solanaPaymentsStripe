import { connect, disconnect, getLocalStorage,  isConnected, request } from "@stacks/connect";
// import { request } from "axios";


export async  function connectButton() {


    if( isConnected()) {
        const data = isConnected();

        console.log("Already  connected  : ", data);
        return ;

    }
    const response = await connect();
    console.log("user connected : ", response.addresses);


    const data = getLocalStorage();

    if(data?.addresses) {
        const stxAddress = data.addresses.stx[0].address;
        const btcAddress = data.addresses.btc[0].address;

         console.log('STX:', stxAddress);
         console.log('BTC:', btcAddress);      
         const accounts = await request('stx_getAccounts');
            const account = accounts.accounts[0]

            console.log('Address:', account.address);
            console.log('Public key:', account.publicKey);
            console.log('Gaia URL:', account.gaiaHubUrl);

    }





}


export function logout() {
    disconnect();


    console.log("user diconnected :", isConnected());



}