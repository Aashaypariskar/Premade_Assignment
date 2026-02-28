import { io } from "socket.io-client";

let socket;

export const connectSocket = () => {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL.replace("/api", ""));
        console.log("Socket connected");
    }
    return socket;
};
