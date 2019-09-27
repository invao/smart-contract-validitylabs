/**
 * @title Smart contract let token holders to vote.
 * @author Validity Labs AG <info@validitylabs.org>
 */
// solhint-disable-next-line compiler-fixed, compiler-gt-0_5
pragma solidity ^0.5.0;

import "../property/Reclaimable.sol";
import "../property/ValidAddress.sol";
import "./IvoToken.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract IvoVoting is ValidAddress, Reclaimable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint32 private constant QUORUM_DENOMINATOR = 100;  // Demoninator of the quorum

    struct Vote {
        address account;            // The voter's account address.
        uint256 votingPower;        // Token balance of the account at the proposal's creation time.
        bool vote;                  // Yes: true; No: false
    }

    struct Proposal {
        string purpose;             // a string that records the purpose of the proposal
        uint32 quorumNum;          // Numerator of the quorum
        uint256 proposalCreation;   // Blocknumber of creation of the proposal
        uint256 votingPeriod;       // The deadline of voting
        bool resultRevealed;        // If the result has been calculated
        bool result;                // Result after calculation
        uint256 totalVotes;         // counter of the received total votes.
        mapping(address=>uint256) indexOfVotes;    // Get the index of the vote per account
        mapping(uint256=>Vote) votes;   // Point the address of the voter to their votes, starting from 1
    }

    Proposal[] private proposals;    // List of proposals
    IvoToken private ivoToken;      // The token address

    event ProposalCreated(string purpose, address indexed creator, uint256 indexed proposalIndex, uint256 timestamp);
    event ProposalVoted(address indexed account, uint256 indexed proposalIndex, uint256 timestamp);
    
    /**
     * @notice Check if the index is valid
     * @param _proposalIndex The index of a potential proposal
     */
    modifier validProposalIndex(uint256 _proposalIndex) {
        require(_proposalIndex < proposals.length, "Such proposal does not exist");
        _;
    } 

    /**
    * @notice initialize the Voting contract with the IVO Token contract and new owner
    * @param _ivoToken Address of the token that is checked for voting. (IVO token address)
    * @param newOwner The adress of the new owner of the voting contrat.
    */
    /* solhint-disable */
    constructor(address _ivoToken, address newOwner) 
        public 
        onlyValidAddress(_ivoToken)
    {
        ivoToken = IvoToken(_ivoToken);
        transferOwnership(newOwner);
    }
    /* solhint-enable */

    /**
     * @notice Token holder creates a proposal
     * @param purpose The short description of the purpose of such proposal
     * @param quorumNum The nominator of the quorum (base: 100)
     * @param votingDuration The duration where votes are accepted
     */
    function createProposal(
        string memory purpose, 
        uint32 quorumNum, 
        uint256 votingDuration
    )
        public
        onlyOwner
    {
        proposals.push(
            Proposal(
                purpose,
                quorumNum,
                // votingDuration.mul(1 days),
                block.number,
                (block.timestamp).add(votingDuration.mul(1 days)),
                false,
                false,
                0
            )
        );
        emit ProposalCreated(purpose, msg.sender, proposals.length.sub(1), block.timestamp);
    }

    /**
     * @notice Cast a vote for a proposal
     * @param proposalIndex The index of the proposal that will be voted
     * @param decision Yes/No Caller's opinion of the proposal
     */
    function castVote(uint256 proposalIndex, bool decision) 
        public
        validProposalIndex(proposalIndex) 
    {
        Proposal storage theProposal = proposals[proposalIndex];
        // check if the propsal is still open for voting
        require(block.timestamp < theProposal.votingPeriod, "It's too late for voting");
        // check if the caller had some tokens at the creation of the proposal
        uint256 votingPower = ivoToken.balanceOfAt(msg.sender, theProposal.proposalCreation);
        require(votingPower > 0, "Caller does not have IVO token!");
        // check if the caller has already voted
        if (theProposal.indexOfVotes[msg.sender] > 0) {
            // The caller has already voted for this proposal.
            // Update old vote
            Vote storage theVote = theProposal.votes[theProposal.indexOfVotes[msg.sender]];
            theVote.vote = decision;
        } else {
            // The caller votes for the first time for this proposal.
            // Create a new vote
            uint256 newTotalVotes = theProposal.totalVotes.add(1);
            theProposal.totalVotes = newTotalVotes;
            theProposal.indexOfVotes[msg.sender] = newTotalVotes;
            theProposal.votes[newTotalVotes] = Vote(msg.sender, votingPower, decision);
        }
        emit ProposalVoted(msg.sender, proposalIndex, block.timestamp);
    }

    /**
     * @notice Calculate the result of a proposal. Anyone can call this function
     * @param proposalIndex The index of the proposal in the array of proposals
     */
    function calculateResults(uint256 proposalIndex) 
        public
        validProposalIndex(proposalIndex) 
    {
        Proposal storage theProposal = proposals[proposalIndex];
        // check if the propsal is ready to close
        require(block.timestamp > theProposal.votingPeriod, "Voting is still possible");
        // check if the result has already been calculated
        require(!theProposal.resultRevealed, "Result of such proposal has already been calculated");
        // start calculate the result
        uint256 totalVotingPower;
        uint256 yesVotingPower;
        // Be careful that the index starts from 1
        for (uint256 i = 1; i <= theProposal.totalVotes; i = i.add(1)) {
            totalVotingPower = totalVotingPower.add(theProposal.votes[i].votingPower);
            if (theProposal.votes[i].vote) {
                yesVotingPower = yesVotingPower.add(theProposal.votes[i].votingPower);
            }
        }
        if (yesVotingPower.mul(QUORUM_DENOMINATOR) > totalVotingPower.mul(theProposal.quorumNum)) {
            theProposal.result = true;
        } else {
            theProposal.result = false;
        }
        theProposal.resultRevealed = true;
    }

    /**
    * @notice get a proposal per index
    * @param proposalIndex the storage index of the proposal in the pushed array. 
    * @return string, uint256, uint256, uint256, bool, bool, uint256
    * These are elements of tha Proposal: purpose, quorum (in 2 decimals),
    * timestamp of the proposal creation, timestamp of the end of voting, status if the 
    * result has been revealed, the result (if it has been revealed), and the total number
    * of votes received per proposal.
    */
    function getProposal(uint256 proposalIndex) 
        public
        view 
        validProposalIndex(proposalIndex)
        returns (string memory, uint256, uint256, uint256, bool, bool, uint256)
    {
        Proposal memory temp = proposals[proposalIndex];
        return (
            temp.purpose,
            temp.quorumNum,
            temp.proposalCreation,
            temp.votingPeriod,
            temp.resultRevealed,
            temp.result,
            temp.totalVotes
        );
    }
}