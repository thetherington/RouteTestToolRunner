import "./main.scss";

import { getDom } from "./app/dom.js";
import { AppController } from "./app/app-controller.js";
import { UIController } from "./app/ui-controller.js";
import { ScheduleController } from "./app/schedule-controller.js";

// get all the elements on the page
const dom = getDom();

const ui = new UIController(dom);
const schedule = new ScheduleController(dom, ui);
const app = new AppController(dom, ui, schedule);

app.start();
schedule.loadSchedules();
