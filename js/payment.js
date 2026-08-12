document.addEventListener(
    "DOMContentLoaded",
    startPayment
);

async function startPayment() {

    const paymentData =
        JSON.parse(
            sessionStorage.getItem(
                "paymentData"
            )
        );

    if (!paymentData) {

        alert("Payment data missing");

        window.location.href =
            "notes.html";

        return;
    }

    const options = {

        key: CONFIG.KEY,

        amount:
            paymentData.amount,

        currency:
            paymentData.currency,

        name: "GetInTouch24",

        description:
            "Notes Purchase",

        order_id:
            paymentData.razorpayOrderId,

        handler: async function (
            response
        ) {

            console.log(
                "Razorpay Success Response:",
                response
            );

            console.log(
                "Order ID:",
                response.razorpay_order_id
            );

            console.log(
                "Payment ID:",
                response.razorpay_payment_id
            );

            console.log(
                "Signature:",
                response.razorpay_signature
            );

            await verifyPayment(
                response
            );
        },

        theme: {
            color: "#2563eb"
        }
    };

    const rzp =
        new Razorpay(options);

    rzp.open();

    rzp.on(
        "payment.failed",
        function () {

            alert(
                "Payment Failed"
            );

            window.location.href =
                "notes.html";
        }
    );
}

async function verifyPayment(
    response
) {

    console.log(
        "Verify Request Payload:",
        {
            razorpayOrderId:
                response.razorpay_order_id,

            razorpayPaymentId:
                response.razorpay_payment_id,

            razorpaySignature:
                response.razorpay_signature
        }
    );

    try {

        const token =
            localStorage.getItem(
                "token"
            );

        const res =
            await fetch(

                CONFIG.BASE_URL +
                "/api/payments/verify",

                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            token
                    },

                    body: JSON.stringify({

                        razorpayOrderId:
                            response.razorpay_order_id,

                        razorpayPaymentId:
                            response.razorpay_payment_id,

                        razorpaySignature:
                            response.razorpay_signature
                    })
                }
            );

        const result =
            await res.text();

        if (
            res.ok &&
            result.includes(
                "verified"
            )
        ) {

            sessionStorage.removeItem(
                "paymentData"
            );

            alert(
                "Payment Successful"
            );

            window.location.href =
    "notes.html";
        }
        else {

            alert(
                "Payment Verification Failed"
            );
        }

    }
    catch (err) {

        console.error(err);

        alert(
            "Verification Error"
        );
    }
}