/**
 * @title Snapshot
 * @dev Utility library of the Snapshot structure, including getting value.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../../node_modules/openzeppelin-solidity/contracts/math/Math.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


library Snapshots {
    using Math for uint256;
    using SafeMath for uint256;

    /**
     * @notice This structure stores the historical value associate at a particular blocknumber
     * @param fromBlock The blocknumber of the creation of the snapshot
     * @param value The value to be recorded
     */
    struct Snapshot {
        uint256 fromBlock;
        uint256 value;
    }

    struct SnapshotList {
        Snapshot[] history;
    }

    /**
     * @notice This function creates snapshots for certain value...
     * @dev To avoid having two Snapshots with the same block.number, we check if the last
     * existing one is the current block.number, we update the last Snapshot
     * @param item The SnapshotList to be operated
     * @param _value The value associated the the item that is going to have a snapshot
     */
    function createSnapshot(SnapshotList storage item, uint256 _value) internal {
        uint256 length = item.history.length;
        if (length == 0 || (item.history[length.sub(1)].fromBlock < block.number)) {
            item.history.push(Snapshot(block.number, _value));
        } else {
            // When the last existing snapshot is ready to be updated
            item.history[length.sub(1)].value = _value;
        }
    }

    /**
     * @notice Find the index of the item in the SnapshotList that contains information
     * corresponding to the blockNumber. (FindLowerBond of the array)
     * @dev The binary search logic is inspired by the Arrays.sol from Openzeppelin
     * @param item The list of Snapshots to be queried
     * @param blockNumber The block number of the queried moment
     * @return The index of the Snapshot array
     */
    function findBlockIndex(
        SnapshotList storage item, 
        uint256 blockNumber
    ) 
        internal
        view 
        returns (uint256)
    {
        // Find lower bound of the array
        uint256 length = item.history.length;

        // Return value for extreme cases: If no snapshot exists and/or the last snapshot
        if (item.history[length.sub(1)].fromBlock <= blockNumber) {
            return length.sub(1);
        } else {
            // Need binary search for the value
            uint256 low = 0;
            uint256 high = length.sub(1);

            while (low < high.sub(1)) {
                uint256 mid = Math.average(low, high);
                // mid will always be strictly less than high and it rounds down
                if (item.history[mid].fromBlock <= blockNumber) {
                    low = mid;
                } else {
                    high = mid;
                }
            }
            return low;
        }   
    }

    /**
     * @notice This function returns the value of the corresponding Snapshot
     * @param item The list of Snapshots to be queried
     * @param blockNumber The block number of the queried moment
     * @return The value of the queried moment
     */
    function getValueAt(
        SnapshotList storage item, 
        uint256 blockNumber
    )
        internal
        view
        returns (uint256)
    {
        if (item.history.length == 0 || blockNumber < item.history[0].fromBlock) {
            return 0;
        } else {
            uint256 index = findBlockIndex(item, blockNumber);
            return item.history[index].value;
        }
    }
}