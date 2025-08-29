import "./main.scss";
import flatpickr from "flatpickr";
import "flatpickr/dist/themes/dark.css";

import { App } from "./app/app.js";
import { UI } from "./app/ui.js";

const ui = new UI();
const app = new App(ui);

app.start();

flatpickr("#myDatePicker", {
    enableTime: true, // Enables time selection
    dateFormat: "Y-m-d H:i", // Sets the date and time format
    // Add other options as needed
});
