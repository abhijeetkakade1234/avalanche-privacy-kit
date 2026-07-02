# Deployment Guide

This is the intended deployment shape. Replace placeholders once infrastructure exists.

## Target platforms

- frontend apps: Cloudflare Pages
- contracts: Avalanche Fuji first, mainnet later
- CI: GitHub Actions

## Deployment requirements

- environment variable management
- build and typecheck steps
- contract address injection
- safe separation between demo and production config

## Minimum release checklist

- app builds in CI
- required environment variables are documented
- deployed app points at the intended network
- contract addresses are correct
- wallet connection works in the deployed environment

## Not covered yet

- secrets naming
- preview environment rules
- release branching strategy
