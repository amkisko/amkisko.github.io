import { defineConfig } from "vite";
import RubyPlugin from "vite-plugin-ruby";
import DartPlugin from "vite-plugin-dart";
import ElmPlugin from "vite-plugin-elm";

export default defineConfig({
  plugins: [
    RubyPlugin(),
    DartPlugin(),
    ElmPlugin()
  ],
});
