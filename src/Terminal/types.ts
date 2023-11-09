import {ReactNode} from "react";

export type TerminalHistoryItem = ReactNode | string;
export type TerminalHistory = TerminalHistoryItem[];
export type TerminalPushToHistoryWithDelayProps = {
  content: TerminalHistoryItem;
  delay?: number;
};