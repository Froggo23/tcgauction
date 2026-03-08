package ian.choe.tcgauction.repository;

import ian.choe.tcgauction.entity.Auction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    List<Auction> findAllByOrderByCreatedAtDesc();
}
