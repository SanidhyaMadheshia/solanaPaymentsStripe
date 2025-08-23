import axios from "axios";
import { connectButton, logout } from "../lib/stacks";


function Payment() {

    
    return <>
        <div>
            <button
                onClick={
                    connectButton
                }
            >connect wallet to sBTC</button>

            <button onClick={logout}>
                logout
            </button>
            <button
            onClick={async ()=> {
                // alert("payment initiated !!")

                const data = await axios.get(`${import.meta.env.VITE_PUBLIC_BACKEND_URL}/hello`);
                console.log(data.data);

                alert(`data from backed : ${data.data.msg}`)
            }}
            >
                do the payment 
            </button>
        </div>
    </>
}



export default Payment;
