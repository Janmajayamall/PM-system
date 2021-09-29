import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./reducers/app";

export default configureStore({
	reducer: {
		app: appReducer,
	},
});
