{ pkgs ? import <nixpkgs> { } }:

with pkgs;

mkYarnPackage {
  name = "polkamisc";
  src = ./.;
  packageJSON = ./package.json;
  yarnLock = ./yarn.lock;
  yarnNix = ./yarn.nix;
}
