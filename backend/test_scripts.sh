# modify l1l2 contract address
starknet invoke --network alpha --address 0x03bd1e9fcc1a516800559bf9a930dfdaec27c3674a7dc5f288fc06e938ca9cf0 --abi test_abi.json  --function modify_l1_contract_address --inputs 0x238a19B40FD66E48bDCe084474701D1B44fA9269 1074429069288436172752421560857185687751552421150680465772143258191166271216 71329849018923103198764058479218288818340385792059405903331840097175664106


# view balance
# starknet call --network alpha --address 0x03bd1e9fcc1a516800559bf9a930dfdaec27c3674a7dc5f288fc06e938ca9cf0 --abi test_abi.json  --function view_balance --inputs 1628448741648245036800002906075225705100596136133912895015035902954123957052

# starknet tx_status --network alpha --id 213870
