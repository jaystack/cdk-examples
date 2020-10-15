#!/usr/bin/env node
import "source-map-support/register";
import { assembleApp } from "../lib/app";

assembleApp().catch((err) => {
  console.error(err);
  process.exit(1);
});
