package ian.choe.tcgauction.repository;

import ian.choe.tcgauction.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByAuctionIdOrderByBidAmountDesc(Long auctionId);

    Optional<Bid> findFirstByAuctionIdOrderByBidAmountDesc(Long auctionId);

    int countByAuctionId(Long auctionId);
}
