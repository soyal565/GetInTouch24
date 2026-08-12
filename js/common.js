document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const footer =
            document.getElementById(
                "footer"
            );

        if (footer) {

            try {

                const res =
                    await fetch(
                        "footer.html"
                    );

                const data =
                    await res.text();

                footer.innerHTML =
                    data;

            }

            catch (err) {

                console.error(err);

            }

        }

    }
);