export const submitInspection = async (answers) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Submitting answers:", answers);

            resolve({ status: 200, message: "Success" });

        }, 1000);
    });
};
