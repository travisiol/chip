"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

/** A WebGL scene that throws (no context, lost context) falls back to the SVG chip. */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") console.warn("[chip] scene failed, using fallback:", error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
