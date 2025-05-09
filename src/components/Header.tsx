import React from "react";
import { useCurrentStation } from "../hooks/useCurrentStation";
import { useThemeStore } from "../hooks/useThemeStore";
import { APP_THEME } from "../models/Theme";
import HeaderE235 from "./HeaderE235";
import headerJl from "./HeaderJL";
import headerJrWest from "./HeaderJRWest";
import headerLed from "./HeaderLED";
import HeaderSaikyo from "./HeaderSaikyo";
import headerTy from "./HeaderTY";
import HeaderTokyoMetro from "./HeaderTokyoMetro";

const Header = () => {
	const theme = useThemeStore((state) => state);
	const station = useCurrentStation();

	if (!station) {
		return null;
	}

	switch (theme) {
		case APP_THEME.TOKYO_METRO:
		case APP_THEME.TOEI:
			return <HeaderTokyoMetro />;
		case APP_THEME.JR_WEST:
			return <headerJrWest />;
		case APP_THEME.YAMANOTE:
		case APP_THEME.JO:
			return <HeaderE235 isJO={theme === APP_THEME.JO} />;
		case APP_THEME.TY:
			return <headerTy />;
		case APP_THEME.SAIKYO:
			return <HeaderSaikyo />;
		case APP_THEME.LED:
			return <headerLed />;
		case APP_THEME.JL:
			return <headerJl />;
		default:
			return null;
	}
};

export default React.memo(Header);
