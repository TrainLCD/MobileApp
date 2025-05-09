import type React from "react";
import { translate } from "../translation";
import FatalErrorScreen from "./FatalErrorScreen";

const ErrorFallback: React.FC = () => (
	<FatalErrorScreen
		showStatus={true}
		title={translate("errorTitle")}
		text={translate("appCrashedText")}
	/>
);

export default ErrorFallback;
