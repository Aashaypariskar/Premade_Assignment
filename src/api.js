export const submitInspection = async (answers) => {
    // Simulating an API call
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Submitting answers:", answers);
            // Simulating success
            resolve({ status: 200, message: "Success" });

            // If you want to simulate failure, uncomment below:
            // reject(new Error("API Submission Failed"));
        }, 1000);
    });
};
