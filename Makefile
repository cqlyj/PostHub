deploy:
	@forge script script/Deploy.s.sol:Deploy --rpc-url https://celo-alfajores.drpc.org --account burner --sender 0xFB6a372F2F51a002b390D18693075157A459641F --broadcast --verify --verifier blockscout --verifier-url https://celo-alfajores.blockscout.com/api/ -vvvv

deploy-flow:
	@forge script script/DeployFlow.s.sol:DeployFlow --rpc-url https://mainnet.evm.nodes.onflow.org --account burner --sender 0xFB6a372F2F51a002b390D18693075157A459641F --broadcast --verify --verifier blockscout --verifier-url https://evm.flowscan.io/api/ -vvvv