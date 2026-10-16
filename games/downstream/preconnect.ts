import { preconnect } from "react-dom";

/**
 * Open connections to the map's tile and font hosts early (a <link rel="preconnect">
 * in the page head), so the map's first requests skip DNS/TLS setup.
 */
export function preconnectMapHosts() {
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
}
