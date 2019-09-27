/**
 * @title Snapshot Token
 * @dev This is an ERC20 compatible token that takes snapshots of account balances.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./Snapshots.sol";
import "./IERC20Snapshot.sol";


contract ERC20Snapshot is ERC20, IERC20Snapshot {
    using Snapshots for Snapshots.SnapshotList;

    mapping(address => Snapshots.SnapshotList) private _snapshotBalances; 
    Snapshots.SnapshotList private _snapshotTotalSupply;   

    event AccountSnapshotCreated(address indexed account, uint256 indexed blockNumber, uint256 value);
    event TotalSupplySnapshotCreated(uint256 indexed blockNumber, uint256 value);

    /**
     * @notice Return the historical supply of the token at a certain time
     * @param blockNumber The block number of the moment when token supply is queried
     * @return The total supply at "blockNumber"
     */
    function totalSupplyAt(uint256 blockNumber) public view returns (uint256) {
        return _snapshotTotalSupply.getValueAt(blockNumber);
    }

    /**
     * @notice Return the historical balance of an account at a certain time
     * @param owner The address of the token holder
     * @param blockNumber The block number of the moment when token supply is queried
     * @return The balance of the queried token holder at "blockNumber"
     */
    function balanceOfAt(address owner, uint256 blockNumber) 
        public 
        view 
        returns (uint256) 
    {
        return _snapshotBalances[owner].getValueAt(blockNumber);
    }

    /** OVERRIDE
     * @notice Transfer tokens between two accounts while enforcing the update of Snapshots
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param value The amount to be transferred
     */
    function _transfer(address from, address to, uint256 value) internal {
        super._transfer(from, to, value);
        _snapshotBalances[from].createSnapshot(balanceOf(from));
        _snapshotBalances[to].createSnapshot(balanceOf(to));
        emit AccountSnapshotCreated(from, block.number, balanceOf(from));
        emit AccountSnapshotCreated(to, block.number, balanceOf(to));
    }

    /** OVERRIDE
     * @notice Mint tokens to one account while enforcing the update of Snapshots
     * @param account The address that receives tokens
     * @param value The amount of tokens to be created
     */
    function _mint(address account, uint256 value) internal {
        super._mint(account, value);
        _snapshotBalances[account].createSnapshot(balanceOf(account));
        _snapshotTotalSupply.createSnapshot(totalSupply());
        emit AccountSnapshotCreated(account, block.number, balanceOf(account));
        emit TotalSupplySnapshotCreated(block.number, totalSupply());
    }

    /** OVERRIDE
     * @notice Burn tokens of one account
     * @param account The address whose tokens will be burnt
     * @param value The amount of tokens to be burnt
     */
    function _burn(address account, uint256 value) internal {
        super._burn(account, value);
        _snapshotBalances[account].createSnapshot(balanceOf(account));
        _snapshotTotalSupply.createSnapshot(totalSupply());
        emit AccountSnapshotCreated(account, block.number, balanceOf(account));
        emit TotalSupplySnapshotCreated(block.number, totalSupply());
    }
}