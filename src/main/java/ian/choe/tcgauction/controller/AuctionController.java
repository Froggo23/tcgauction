package ian.choe.tcgauction.controller;

import ian.choe.tcgauction.dto.*;
import ian.choe.tcgauction.service.AuctionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final AuctionService auctionService;

    @GetMapping
    public List<AuctionListDto> list() {
        return auctionService.getAllAuctions();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id) {
        return auctionService.getAuctionDetail(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam Integer startingPrice,
            @RequestParam Integer bidUnit,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam String seller,
            @RequestParam(required = false) MultipartFile image) {
        try {
            Long auctionId = auctionService.createAuction(
                    title, description, startingPrice, bidUnit, startDate, endDate, seller, image);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", auctionId));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "파일 업로드 실패: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/bid")
    public ResponseEntity<?> bid(@PathVariable Long id, @RequestBody BidRequest request) {
        try {
            BidDto result = auctionService.placeBid(id, request.getBidder(), request.getBidAmount());
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
